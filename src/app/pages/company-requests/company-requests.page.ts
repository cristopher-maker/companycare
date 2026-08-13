import { Component, OnDestroy, OnInit } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { UiService } from '../../core/services/ui.service';
import { 
  FollowupService, 
  PATIENT_STATUS_CONFIG, 
  PatientStatus, 
  FollowupPriority,
  FOLLOWUP_TYPE_CONFIG
} from '../../core/services/followup.service';

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
  
  public searchTerm = '';
  public activeStatusFilter: 'Todos' | 'Activos' | 'Resueltos' = 'Todos';
  public activePatientStatusFilter: PatientStatus | 'all' = 'all';
  public sortBy: 'recent' | 'priority' | 'status' = 'recent';
  public expandedId: string | null = null;
  
  public readonly patientStatusConfig = PATIENT_STATUS_CONFIG;
  private unsub?: { data: { subscription: { unsubscribe: () => void } } };

  constructor(
    private readonly supabase: SupabaseService,
    public readonly ui: UiService,
    public readonly followupService: FollowupService
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
      // 1. Fetch care requests (sin FK join)
      const { data: requests, error: reqError } = await this.supabase.client
        .from('care_requests')
        .select('id, topic, channel, status, created_at, details, employee_id')
        .order('created_at', { ascending: false });

      if (reqError) throw reqError;

      if (!requests || requests.length === 0) {
        this.items = [];
        this.loading = false;
        return;
      }

      // 2. Fetch profiles for all employee_ids
      const employeeIds = [...new Set(requests.map(r => r.employee_id).filter(Boolean))];
      let profileMap = new Map<string, { full_name: string; email: string }>();
      if (employeeIds.length > 0) {
        const { data: profiles } = await this.supabase.client
          .from('profiles')
          .select('id, full_name, email')
          .in('id', employeeIds);
        if (profiles) {
          profiles.forEach((p: any) => profileMap.set(p.id, { full_name: p.full_name, email: p.email }));
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
        const fup = followups.find((f: any) => f.request_id === req.id);
        const profile = profileMap.get(req.employee_id);

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
          last_note: fup?.note || req.details || 'Sin notas de seguimiento',
          expert_name: fup?.expert_id ? (expertMap.get(fup.expert_id) || null) : null,
          channel_icon: fup?.followup_type ? (FOLLOWUP_TYPE_CONFIG[fup.followup_type as keyof typeof FOLLOWUP_TYPE_CONFIG]?.icon || 'event') : 'event',
          next_followup: fup?.next_followup_date || null,
          priority: fup?.priority || 'media'
        });
      }
      
      this.items = cases;

    } catch (err: any) {
      console.error('Error fetching monitored cases', err);
      this.error = 'No se pudieron cargar los casos. Intenta actualizar.';
      this.items = [];
    } finally {
      this.loading = false;
    }
  }



  // --- Computed Properties ---

  public get filteredItems(): MonitoredCase[] {
    let result = this.items;

    // Search
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(item => 
        item.employee_name.toLowerCase().includes(term) ||
        item.topic.toLowerCase().includes(term) ||
        item.last_note.toLowerCase().includes(term)
      );
    }

    // Status Filter (Abierto/Cerrado)
    if (this.activeStatusFilter === 'Activos') {
      result = result.filter(i => ['open', 'assigned', 'in_progress'].includes(i.status));
    } else if (this.activeStatusFilter === 'Resueltos') {
      result = result.filter(i => ['resolved', 'closed'].includes(i.status));
    }

    // Patient Status Filter
    if (this.activePatientStatusFilter !== 'all') {
      result = result.filter(i => i.patient_status === this.activePatientStatusFilter);
    }

    // Sort
    result = result.sort((a, b) => {
      if (this.sortBy === 'recent') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
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

  public get statusCounts(): Record<PatientStatus, number> {
    const counts: Record<PatientStatus, number> = {
      estable: 0, mejorando: 0, sin_cambios: 0, empeorando: 0, requiere_atencion: 0, alta: 0, derivado: 0
    };
    this.items.forEach(i => {
      if (counts[i.patient_status] !== undefined) {
        counts[i.patient_status]++;
      }
    });
    return counts;
  }

  public get urgentCount(): number {
    return this.items.filter(i => i.priority === 'urgente').length;
  }

  public get highPriorityCount(): number {
    return this.items.filter(i => i.priority === 'alta').length;
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
}
