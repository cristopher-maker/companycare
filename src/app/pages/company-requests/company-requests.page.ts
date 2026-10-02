import { Component, OnDestroy, OnInit } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { UiService } from '../../core/services/ui.service';
import { 
  FollowupService, 
  PATIENT_STATUS_CONFIG, 
  PatientStatus, 
  FollowupPriority,
  FollowupType,
  FOLLOWUP_TYPE_CONFIG
} from '../../core/services/followup.service';
import { WhatsAppBotService } from '../../core/services/whatsapp-bot.service';

export interface CaseFollowupItem {
  id: string;
  patient_status: PatientStatus;
  note: string;
  internal_note?: string | null;
  followup_type: FollowupType;
  next_followup_date: string | null;
  priority: FollowupPriority;
  created_at: string;
  expert_name: string | null;
}

export interface MonitoredCase {
  id: string;
  topic: string;
  channel: string;
  status: string;
  created_at: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  // Followup details
  patient_status: PatientStatus;
  last_note: string;
  expert_name: string | null;
  channel_icon: string;
  next_followup: string | null;
  priority: FollowupPriority;

  // Contexto del familiar cuidado
  care_receiver_name?: string | null;
  care_receiver_relation?: string | null;
  care_receiver_age?: string | null;
  care_receiver_dependency?: string | null;
  care_receiver_location?: string | null;
  care_receiver_condition?: string | null;

  // Historial cronológico de todas las evoluciones y notas
  followups_history: CaseFollowupItem[];
}

export interface GroupedCollaboratorCase {
  employee_id: string;
  employee_name: string;
  employee_email: string;

  // Familiar cuidado (contexto)
  care_receiver_name?: string | null;
  care_receiver_relation?: string | null;
  care_receiver_age?: string | null;
  care_receiver_dependency?: string | null;
  care_receiver_location?: string | null;
  care_receiver_condition?: string | null;

  // Estado general consolidado
  patient_status: PatientStatus;
  priority: FollowupPriority;
  has_active_request: boolean;
  active_requests_count: number;
  total_sessions_count: number;
  last_activity_date: string;
  latest_topic: string;
  last_note: string;
  expert_name: string | null;
  next_followup: string | null;
  channel_icon: string;

  // Casos y evoluciones
  cases: MonitoredCase[];
  followups_history: CaseFollowupItem[];
  full_intake?: any;
}

@Component({
  selector: 'app-company-requests',
  templateUrl: './company-requests.page.html',
  styleUrls: ['./company-requests.page.scss'],
})
export class CompanyRequestsPage implements OnInit, OnDestroy {
  public loading = true;
  public error: string | null = null;
  public items: MonitoredCase[] = [];
  public groupedCollaborators: GroupedCollaboratorCase[] = [];
  
  public searchTerm = '';
  public activeStatusFilter: 'Todos' | 'Activos' | 'Resueltos' = 'Activos';
  public activePatientStatusFilter: PatientStatus | 'all' = 'all';
  public sortBy: 'recent' | 'priority' | 'status' = 'recent';
  public expandedId: string | null = null;
  
  public readonly patientStatusConfig = PATIENT_STATUS_CONFIG;
  private unsub?: { data: { subscription: { unsubscribe: () => void } } };

  public notifyingId: string | null = null;
  public notifySuccessId: string | null = null;
  public selectedIntakeModal: GroupedCollaboratorCase | null = null;

  constructor(
    private readonly supabase: SupabaseService,
    public readonly ui: UiService,
    public readonly followupService: FollowupService,
    public readonly whatsappBot: WhatsAppBotService
  ) {}

  public ngOnInit(): void {
    void this.refresh();
    this.unsub = this.supabase.client.auth.onAuthStateChange(() => void this.refresh());
  }

  public ngOnDestroy(): void {
    this.unsub?.data.subscription.unsubscribe();
  }

  public async refresh(): Promise<void> {
    this.loading = true;
    this.error = null;

    try {
      // 0. Obtener sesión del usuario actual
      const { data: sessionData } = await this.supabase.client.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        this.items = [];
        this.loading = false;
        return;
      }

      // Obtener el rol del perfil del usuario
      const { data: userProfile } = await this.supabase.client
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const isPlatformAdmin = userProfile?.role === 'admin';

      // Obtener la empresa a la que pertenece el usuario
      const { data: userMembership } = await this.supabase.client
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();

      const companyId = userMembership?.company_id;

      let companyUserIds: string[] | null = null;

      if (companyId) {
        // Si pertenece a una empresa, obtener todos los IDs de colaboradores de esa empresa
        const { data: members } = await this.supabase.client
          .from('company_members')
          .select('user_id')
          .eq('company_id', companyId);

        if (members && members.length > 0) {
          companyUserIds = members.map(m => m.user_id).filter(Boolean);
        } else {
          companyUserIds = [];
        }
      } else if (!isPlatformAdmin) {
        // Si no pertenece a ninguna empresa y tampoco es Admin general, no tiene acceso
        this.items = [];
        this.loading = false;
        return;
      }

      // 1. Fetch care requests (filtrado por los colaboradores de la empresa)
      let reqQuery = this.supabase.client
        .from('care_requests')
        .select('id, topic, channel, status, created_at, details, employee_id');

      if (companyUserIds !== null) {
        if (companyUserIds.length === 0) {
          this.items = [];
          this.loading = false;
          return;
        }
        reqQuery = reqQuery.in('employee_id', companyUserIds);
      }

      const { data: requests, error: reqError } = await reqQuery.order('created_at', { ascending: false });

      if (reqError) throw reqError;

      if (!requests || requests.length === 0) {
        this.items = [];
        this.loading = false;
        return;
      }

      // 2. Fetch profiles and care intakes for all employee_ids
      const employeeIds = [...new Set(requests.map(r => r.employee_id).filter(Boolean))];
      let profileMap = new Map<string, { full_name: string; email: string }>();
      let intakeMap = new Map<string, any>();

      if (employeeIds.length > 0) {
        const [profilesRes, intakesRes] = await Promise.all([
          this.supabase.client.from('profiles').select('id, full_name, email').in('id', employeeIds),
          this.supabase.client.from('care_intakes').select('*').in('employee_id', employeeIds).order('created_at', { ascending: false })
        ]);

        if (profilesRes.data) {
          profilesRes.data.forEach((p: any) => profileMap.set(p.id, { full_name: p.full_name, email: p.email }));
        }

        if (intakesRes.data) {
          for (const intake of intakesRes.data) {
            if (!intakeMap.has(intake.employee_id)) {
              intakeMap.set(intake.employee_id, intake);
            }
          }
        }
      }

      // 3. Fetch latest followups for each request
      const requestIds = requests.map(r => r.id);
      let followups: any[] = [];
      let expertMap = new Map<string, string>();

      const { data: folData, error: folError } = await this.supabase.client
        .from('patient_followups')
        .select('*')
        .in('request_id', requestIds)
        .order('created_at', { ascending: false });

      if (!folError && folData) {
        followups = folData;

        // 4. Fetch expert names
        const expertIds = [...new Set(followups.map((f: any) => f.expert_id).filter(Boolean))];
        if (expertIds.length > 0) {
          const { data: experts } = await this.supabase.client
            .from('profiles')
            .select('id, full_name')
            .in('id', expertIds);
          if (experts) {
            experts.forEach((e: any) => expertMap.set(e.id, e.full_name));
          }
        }
      }

      // 5. Build monitored cases
      const cases: MonitoredCase[] = [];

      for (const req of requests) {
        // Obtenemos todos los seguimientos y notas de este caso
        const caseFollowups: CaseFollowupItem[] = followups
          .filter((f: any) => f.request_id === req.id || (!f.request_id && f.employee_id === req.employee_id))
          .map((f: any) => ({
            id: f.id,
            patient_status: (f.patient_status as PatientStatus) || 'estable',
            note: f.note || '',
            internal_note: f.internal_note || null,
            followup_type: (f.followup_type as FollowupType) || 'nota_interna',
            next_followup_date: f.next_followup_date || null,
            priority: (f.priority as FollowupPriority) || 'media',
            created_at: f.created_at,
            expert_name: expertMap.get(f.expert_id) || 'Care Expert'
          }));

        // Si no existen notas clínicas aún pero la solicitud tiene detalle inicial, lo agregamos como registro de apertura
        if (caseFollowups.length === 0 && req.details) {
          caseFollowups.push({
            id: 'init-' + req.id,
            patient_status: 'estable',
            note: req.details,
            followup_type: (req.channel?.toLowerCase().includes('video') ? 'videollamada' : req.channel?.toLowerCase().includes('chat') ? 'chat' : 'llamada') as FollowupType,
            next_followup_date: null,
            priority: 'media',
            created_at: req.created_at,
            expert_name: 'Solicitud Inicial'
          });
        }

        const fup = caseFollowups[0] || null;
        const profile = profileMap.get(req.employee_id);
        const intake = intakeMap.get(req.employee_id);
        const intakeDetails = this.extractIntakeDetails(intake);

        cases.push({
          id: req.id,
          topic: req.topic || 'Consulta General',
          channel: req.channel,
          status: req.status,
          created_at: req.created_at,
          employee_id: req.employee_id,
          employee_name: profile?.full_name || 'Colaborador',
          employee_email: profile?.email || '',
          patient_status: fup?.patient_status || 'estable',
          last_note: fup?.note || req.details || 'Sin notas de seguimiento registradas',
          expert_name: fup?.expert_name || null,
          channel_icon: fup?.followup_type ? (FOLLOWUP_TYPE_CONFIG[fup.followup_type as keyof typeof FOLLOWUP_TYPE_CONFIG]?.icon || 'event') : 'event',
          next_followup: fup?.next_followup_date || null,
          priority: fup?.priority || 'media',
          care_receiver_name: intakeDetails?.name || null,
          care_receiver_relation: intakeDetails?.relation || null,
          care_receiver_age: intakeDetails?.age || null,
          care_receiver_dependency: intakeDetails?.dependency || null,
          care_receiver_location: intakeDetails?.location || null,
          care_receiver_condition: intakeDetails?.condition || null,
          followups_history: caseFollowups
        });
      }
      
      this.items = cases;

      // 6. Consolidar por Colaborador (1 fila por persona)
      const collaboratorMap = new Map<string, MonitoredCase[]>();
      for (const c of cases) {
        const existing = collaboratorMap.get(c.employee_id) || [];
        existing.push(c);
        collaboratorMap.set(c.employee_id, existing);
      }

      const groups: GroupedCollaboratorCase[] = [];
      for (const [employeeId, empCases] of collaboratorMap.entries()) {
        empCases.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const latestCase = empCases[0];

        const careReceiverName = empCases.find(c => !!c.care_receiver_name)?.care_receiver_name || latestCase.care_receiver_name || null;
        const careReceiverRelation = empCases.find(c => !!c.care_receiver_relation)?.care_receiver_relation || latestCase.care_receiver_relation || null;
        const careReceiverAge = empCases.find(c => !!c.care_receiver_age)?.care_receiver_age || latestCase.care_receiver_age || null;
        const careReceiverDependency = empCases.find(c => !!c.care_receiver_dependency)?.care_receiver_dependency || latestCase.care_receiver_dependency || null;
        const careReceiverLocation = empCases.find(c => !!c.care_receiver_location)?.care_receiver_location || latestCase.care_receiver_location || null;
        const careReceiverCondition = empCases.find(c => !!c.care_receiver_condition)?.care_receiver_condition || latestCase.care_receiver_condition || null;

        const allFollowups: CaseFollowupItem[] = [];
        const seenFupIds = new Set<string>();
        for (const c of empCases) {
          for (const f of c.followups_history) {
            if (!seenFupIds.has(f.id)) {
              seenFupIds.add(f.id);
              allFollowups.push(f);
            }
          }
        }
        allFollowups.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        const hasActive = empCases.some(c => ['open', 'assigned', 'in_progress'].includes(c.status));
        const activeCount = empCases.filter(c => ['open', 'assigned', 'in_progress'].includes(c.status)).length;

        let patientStatus: PatientStatus = latestCase.patient_status;
        if (empCases.some(c => c.patient_status === 'requiere_atencion')) {
          patientStatus = 'requiere_atencion';
        } else if (empCases.some(c => c.patient_status === 'empeorando')) {
          patientStatus = 'empeorando';
        }

        let priority: FollowupPriority = 'media';
        if (empCases.some(c => c.priority === 'urgente')) priority = 'urgente';
        else if (empCases.some(c => c.priority === 'alta')) priority = 'alta';
        else if (empCases.some(c => c.priority === 'media')) priority = 'media';
        else priority = 'baja';

        groups.push({
          employee_id: employeeId,
          employee_name: latestCase.employee_name,
          employee_email: latestCase.employee_email,
          care_receiver_name: careReceiverName,
          care_receiver_relation: careReceiverRelation,
          care_receiver_age: careReceiverAge,
          care_receiver_dependency: careReceiverDependency,
          care_receiver_location: careReceiverLocation,
          care_receiver_condition: careReceiverCondition,
          patient_status: patientStatus,
          priority: priority,
          has_active_request: hasActive,
          active_requests_count: activeCount,
          total_sessions_count: empCases.length,
          last_activity_date: latestCase.created_at,
          latest_topic: latestCase.topic,
          last_note: allFollowups[0]?.note || latestCase.last_note,
          expert_name: allFollowups[0]?.expert_name || latestCase.expert_name,
          next_followup: latestCase.next_followup || allFollowups[0]?.next_followup_date || null,
          channel_icon: latestCase.channel_icon,
          cases: empCases,
          followups_history: allFollowups,
          full_intake: this.extractIntakeDetails(intakeMap.get(employeeId))
        });
      }

      this.groupedCollaborators = groups;

    } catch (err: any) {
      console.error('Error fetching monitored cases', err);
      this.error = 'No se pudieron cargar los casos. Intenta actualizar.';
      this.items = [];
      this.groupedCollaborators = [];
    } finally {
      this.loading = false;
    }
  }

  private extractIntakeDetails(intakeData: any) {
    if (!intakeData) return null;
    const payload = (intakeData.payload as any) || {};

    const read = (paths: string[][]): string | null => {
      for (const path of paths) {
        let curr = payload;
        let found = true;
        for (const segment of path) {
          if (curr && typeof curr === 'object' && segment in curr) {
            curr = curr[segment];
          } else {
            found = false;
            break;
          }
        }
        if (found && curr !== null && curr !== undefined && curr !== '') {
          return String(curr).trim();
        }
      }
      return null;
    };

    const name = intakeData.care_receiver_full_name || read([['care_receiver', 'full_name'], ['care_receiver', 'name'], ['careReceiverName']]);
    const relation = read([['caregiver', 'relation'], ['family', 'relation'], ['relation']]);
    const age = read([['care_receiver', 'age'], ['family', 'age'], ['relative', 'age'], ['dependent', 'age']]);
    const dependency = read([['care_receiver', 'dependency_level'], ['dependency_level'], ['dependencyLevel']]);
    const location = read([['location', 'comuna'], ['location', 'city'], ['location', 'address'], ['comuna']]);
    const condition = read([['care_receiver', 'primary_condition'], ['clinical_profile'], ['condition']]);
    const rut = intakeData.care_receiver_rut || read([['care_receiver', 'rut'], ['careReceiverRut']]);
    const birthDate = intakeData.care_receiver_birth_date || read([['care_receiver', 'birth_date'], ['careReceiverBirthDate']]);
    const phone = intakeData.care_receiver_phone || read([['care_receiver', 'phone'], ['careReceiverPhone']]);
    const healthCoverage = intakeData.care_receiver_health_coverage || read([['care_receiver', 'health_coverage'], ['healthCoverage']]);
    const careType = read([['care_type'], ['careType']]);
    const housingType = read([['location', 'has_two_floors'], ['location', 'two_floors'], ['hasTwoFloors']]);
    const supportNetwork = read([['family_context', 'support_network'], ['supportNetwork']]);
    const notes = read([['notes'], ['additional_notes']]);

    return {
      name,
      relation,
      age,
      dependency,
      location,
      condition,
      rut,
      birthDate,
      phone,
      healthCoverage,
      careType,
      housingType,
      supportNetwork,
      notes
    };
  }

  public parseNote(note: string | null | undefined): { tag: string | null; text: string } {
    if (!note) return { tag: null, text: 'Sin notas' };
    const match = note.match(/^\[Estado:\s*([^\]]+)\]\s*(.*)$/i);
    if (match) {
      return {
        tag: match[1].trim(),
        text: match[2].trim() || 'Sin observaciones adicionales'
      };
    }
    return { tag: null, text: note };
  }

  public formatDependency(level: string | null | undefined): string {
    if (!level) return 'No especificada';
    const l = level.trim().toLowerCase();
    const map: Record<string, string> = {
      'low': 'Leve',
      'medium': 'Moderada',
      'moderate': 'Moderada',
      'high': 'Severa',
      'severe': 'Severa',
      'total': 'Total / Postrado',
      'independent': 'Autoválido',
      'autovalido': 'Autoválido',
      'autovalente': 'Autovalente'
    };
    return map[l] || (level.charAt(0).toUpperCase() + level.slice(1));
  }

  public formatRelation(rel: string | null | undefined, collaboratorName?: string): string {
    if (!rel) return 'Familiar a cargo';
    const r = rel.trim().toLowerCase();
    const colab = collaboratorName ? collaboratorName.split(' ')[0] : 'Colaborador';
    
    // Si la persona contestó "Hijo" o "Hija", se refiere a su propio rol respecto al familiar (el paciente es su padre/madre)
    if (r.includes('hijo') || r.includes('hija') || r === 'child') {
      return `Padre / Madre (${colab} es su hijo/a)`;
    }
    if (r.includes('nieto') || r.includes('nieta') || r === 'grandchild') {
      return `Abuelo/a (${colab} es su nieto/a)`;
    }
    
    const map: Record<string, string> = {
      'mother': 'Madre',
      'madre': 'Madre',
      'father': 'Padre',
      'padre': 'Padre',
      'spouse': 'Cónyuge / Pareja',
      'cónyuge': 'Cónyuge / Pareja',
      'conyuge': 'Cónyuge / Pareja',
      'esposo': 'Cónyuge / Pareja',
      'esposa': 'Cónyuge / Pareja',
      'partner': 'Pareja',
      'pareja': 'Pareja',
      'grandmother': 'Abuela',
      'abuela': 'Abuela',
      'grandfather': 'Abuelo',
      'abuelo': 'Abuelo',
      'parent': 'Padre / Madre',
      'sibling': 'Hermano(a)',
      'hermano': 'Hermano(a)',
      'hermana': 'Hermano(a)',
      'suegro': 'Suegro(a)',
      'suegra': 'Suegro(a)',
      'tio': 'Tío(a)',
      'tío': 'Tío(a)',
      'tia': 'Tío(a)',
      'tía': 'Tío(a)'
    };
    return map[r] || (rel.charAt(0).toUpperCase() + rel.slice(1));
  }

  public openIntakeModal(item: GroupedCollaboratorCase): void {
    this.selectedIntakeModal = item;
  }

  public closeIntakeModal(): void {
    this.selectedIntakeModal = null;
  }

  public formatHousing(val: string | null | undefined): string {
    if (!val) return 'No especificada';
    const map: Record<string, string> = {
      'house_1f': 'Casa de 1 piso (Sin escaleras)',
      'house_2f': 'Casa de 2 o más pisos (Con escaleras)',
      'dept_elevator': 'Departamento con ascensor',
      'dept_stairs': 'Departamento sin ascensor (Por escalera)',
      'adapted': 'Vivienda adaptada (Rampa / Salvaescaleras)'
    };
    return map[val] || val;
  }


  public getDependencyColor(level: string | null | undefined): string {
    if (!level) return '#64748b';
    const l = level.trim().toLowerCase();
    if (l.includes('sever') || l.includes('total') || l.includes('postrad') || l === 'high') return '#dc2626';
    if (l.includes('moderad') || l === 'medium' || l === 'moderate') return '#f59e0b';
    if (l.includes('leve') || l === 'low') return '#2563eb';
    if (l.includes('auto') || l.includes('independ')) return '#16a34a';
    return '#475569';
  }



  // --- Computed Properties ---

  public get filteredCollaborators(): GroupedCollaboratorCase[] {
    let result = this.groupedCollaborators;

    // Search
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(item => 
        item.employee_name.toLowerCase().includes(term) ||
        item.employee_email.toLowerCase().includes(term) ||
        (item.care_receiver_name && item.care_receiver_name.toLowerCase().includes(term)) ||
        item.latest_topic.toLowerCase().includes(term)
      );
    }

    // Status Filter (Activos / Resueltos / Todos)
    if (this.activeStatusFilter === 'Activos') {
      result = result.filter(i => i.has_active_request);
    } else if (this.activeStatusFilter === 'Resueltos') {
      result = result.filter(i => !i.has_active_request);
    }

    // Patient Status Filter
    if (this.activePatientStatusFilter !== 'all') {
      result = result.filter(i => i.patient_status === this.activePatientStatusFilter);
    }

    // Sort
    result = result.sort((a, b) => {
      if (this.sortBy === 'recent') {
        return new Date(b.last_activity_date).getTime() - new Date(a.last_activity_date).getTime();
      }
      if (this.sortBy === 'priority') {
        const priorityWeight = { urgente: 4, alta: 3, media: 2, baja: 1 };
        return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      }
      if (this.sortBy === 'status') {
        const statusWeight: Record<PatientStatus, number> = {
          requiere_atencion: 7, empeorando: 6, sin_cambios: 5, estable: 4, mejorando: 3, derivado: 2, alta: 1
        };
        return statusWeight[b.patient_status] - statusWeight[a.patient_status];
      }
      return 0;
    });

    return result;
  }

  public get filteredItems(): GroupedCollaboratorCase[] {
    return this.filteredCollaborators;
  }

  public get statusCounts(): Record<PatientStatus, number> {
    const counts: Record<PatientStatus, number> = {
      estable: 0, mejorando: 0, sin_cambios: 0, empeorando: 0, requiere_atencion: 0, alta: 0, derivado: 0
    };
    this.groupedCollaborators.forEach(i => {
      if (counts[i.patient_status] !== undefined) {
        counts[i.patient_status]++;
      }
    });
    return counts;
  }

  public get urgentCount(): number {
    return this.groupedCollaborators.filter(i => i.priority === 'urgente' || i.patient_status === 'requiere_atencion').length;
  }

  public get highPriorityCount(): number {
    return this.groupedCollaborators.filter(i => i.priority === 'alta').length;
  }

  // --- Helpers ---

  public getInitials(name: string): string {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  public getPriorityColor(priority: FollowupPriority): string {
    switch(priority) {
      case 'baja': return '#16a34a'; // green
      case 'media': return '#f59e0b'; // amber
      case 'alta': return '#ea580c'; // orange
      case 'urgente': return '#dc2626'; // red
      default: return '#9ca3af';
    }
  }

  public timeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    return `Hace ${diffDays} días`;
  }
  
  public getPatientStatusLabel(status: PatientStatus): string {
    return PATIENT_STATUS_CONFIG[status]?.label || 'Desconocido';
  }

  public getShortPatientStatusLabel(status: PatientStatus): string {
    const shortLabels: Record<PatientStatus, string> = {
      estable: 'Estable',
      mejorando: 'Mejorando',
      sin_cambios: 'Sin cambios',
      empeorando: 'Empeorando',
      requiere_atencion: 'Atención req.',
      alta: 'Alta',
      derivado: 'Derivado'
    };
    return shortLabels[status] || this.getPatientStatusLabel(status);
  }
  
  public setPatientStatusFilter(status: PatientStatus | 'all') {
    this.activePatientStatusFilter = this.activePatientStatusFilter === status ? 'all' : status;
  }

  public toggleExpand(id: string): void {
    this.expandedId = this.expandedId === id ? null : id;
  }

  public getPriorityLabel(priority: FollowupPriority): string {
    switch(priority) {
      case 'baja': return 'Baja';
      case 'media': return 'Media';
      case 'alta': return 'Alta';
      case 'urgente': return 'Urgente';
      default: return 'Sin definir';
    }
  }

  public getChannelLabel(channel: string): string {
    const map: Record<string, string> = {
      'Videollamada': 'Videollamada',
      'Llamada': 'Llamada',
      'Chat': 'Chat',
      'Presencial': 'Presencial'
    };
    return map[channel] || channel || 'No especificado';
  }

  public getFollowupTypeInfo(type: string): { label: string; icon: string } {
    return FOLLOWUP_TYPE_CONFIG[type as FollowupType] || { label: 'Nota', icon: 'note' };
  }

  public async sendCaseAlertEmail(item: GroupedCollaboratorCase | MonitoredCase): Promise<void> {
    if (!item.employee_email) {
      alert('El caso no tiene un correo de colaborador o familia registrado.');
      return;
    }

    if (!this.whatsappBot.getWebhookUrl()) {
      alert('Debes configurar la URL del Webhook de n8n en tu Perfil (Notificaciones) antes de enviar alertas.');
      return;
    }

    const targetId = (item as any).employee_id || (item as any).id;
    this.notifyingId = targetId;
    this.notifySuccessId = null;

    try {
      const statusConfig = this.patientStatusConfig[item.patient_status] || { label: item.patient_status, color: '#0284c7' };
      const patientName = item.care_receiver_name || (item.care_receiver_relation ? `Familiar (${item.care_receiver_relation})` : 'Paciente en seguimiento');

      const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 620px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
          <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 24px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 700;">Company Care</h1>
            <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.95;">Monitoreo de Bienestar & Acompañamiento Clínico</p>
          </div>

          <div style="padding: 28px 24px;">
            <p style="font-size: 16px; margin: 0 0 14px 0; color: #1e293b;">
              Estimado/a <strong>${item.employee_name}</strong>,
            </p>
            <p style="font-size: 14px; line-height: 1.5; color: #475569; margin: 0 0 20px 0;">
              Te compartimos la última actualización de seguimiento y estado clínico registrado para <strong>${patientName}</strong> en el sistema de bienestar de Company Care.
            </p>

            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; margin-bottom: 20px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 6px 0; color: #64748b; width: 140px;"><strong>Paciente / Familiar:</strong></td>
                  <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${patientName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;"><strong>Estado de salud:</strong></td>
                  <td style="padding: 6px 0;">
                    <span style="background-color: ${statusConfig.color}18; color: ${statusConfig.color}; border: 1px solid ${statusConfig.color}40; padding: 4px 10px; border-radius: 20px; font-weight: 600; font-size: 13px; display: inline-block;">
                      ● ${statusConfig.label}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;"><strong>Prioridad:</strong></td>
                  <td style="padding: 6px 0; color: #0f172a; text-transform: capitalize;">${this.getPriorityLabel(item.priority)}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;"><strong>Especialista:</strong></td>
                  <td style="padding: 6px 0; color: #0f172a;">${item.expert_name || 'Care Expert asignado'}</td>
                </tr>
                ${item.next_followup ? `
                <tr>
                  <td style="padding: 6px 0; color: #64748b;"><strong>Próximo control:</strong></td>
                  <td style="padding: 6px 0; color: #0284c7; font-weight: 600;">${new Date(item.next_followup).toLocaleDateString('es-CL')}</td>
                </tr>` : ''}
              </table>
            </div>

            <div style="margin-bottom: 24px;">
              <div style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 8px;">
                Última nota y recomendaciones del caso
              </div>
              <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; border-radius: 6px; font-size: 14px; line-height: 1.6; color: #1e293b;">
                ${(item.last_note || 'Sin notas adicionales registradas').replace(/\n/g, '<br/>')}
              </div>
            </div>

            <div style="text-align: center; margin: 30px 0 10px 0;">
              <a href="https://companycare.cl/#/company-requests" style="background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(2,132,199,0.3);">
                Ver Caso en Monitoreo de Bienestar →
              </a>
            </div>
          </div>

          <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
            Company Care · SeniorAdvisor Chile. Sistema confidencial de acompañamiento y cuidados.
          </div>
        </div>
      `;

      const res = await this.whatsappBot.sendNotification({
        email: item.employee_email,
        recipientName: item.employee_name,
        subject: `🩺 Actualización de Monitoreo: ${patientName} (${statusConfig.label})`,
        message: `Hola ${item.employee_name},\n\nSe ha actualizado el estado de salud de ${patientName}: ${statusConfig.label}.\n\nÚltimo reporte: "${item.last_note}"\n\nEspecialista: ${item.expert_name || 'Care Expert'}`,
        html: html,
        event: 'monitoreo_bienestar_update',
        metadata: {
          case_id: targetId,
          patient_name: patientName,
          patient_status: item.patient_status,
          priority: item.priority
        }
      });

      if (res.success) {
        this.notifySuccessId = targetId;
        setTimeout(() => {
          if (this.notifySuccessId === targetId) this.notifySuccessId = null;
        }, 5000);
      } else {
        alert('Aviso: ' + res.message);
      }
    } catch (err: any) {
      alert('Error al enviar alerta por correo: ' + (err?.message || err));
    } finally {
      this.notifyingId = null;
    }
  }
}
