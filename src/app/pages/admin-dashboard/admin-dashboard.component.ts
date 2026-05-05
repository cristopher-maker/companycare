import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';
import { AuthService } from '../../core/services/auth.service';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { ChartConfiguration } from 'chart.js';

type LeadStatus = 'nuevo' | 'contactado' | 'evaluacion' | 'match' | 'cerrado' | 'perdido';
type ConfigSection = 'company' | 'appearance' | 'workflow' | 'business' | 'documents' | 'messages' | 'onboarding';
type DashboardView = 'metricas' | 'sedes' | 'camas' | 'pacientes' | 'admisiones' | 'tareas' | 'empleados' | 'vouchers' | 'config';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent implements OnInit {
  @Input() hideWorkflowConfig = false;
  @Input() companyConfigMode = false;

  // Controla qué tabla/vista se está mostrando actualmente
  currentView: DashboardView = 'metricas';

  loading = true;
  profileRole: string | null = null;
  hasActivePlan = false;
  activePlanTier: string | null = null;

  // Variables de Modal y Formulario
  companyId: string | null = null;
  showSedeModal = false;
  showCamaModal = false;
  showPacienteModal = false;
  showLeadModal = false;
  showTareaModal = false;
  savingSede = false;
  savingCama = false;
  savingPaciente = false;
  savingLead = false;
  savingTarea = false;

  sedeDraft: any = { id: null, nombre: '', ubicacion: '' };
  camaDraft: any = { db_id: null, resource_code: '', provider_id: '', care_type: 'Básico', status: 'Disponible', notes: '' };
  pacienteDraft: any = { db_id: null, cama_id: '', sede: '', nombre_paciente: '' };
  leadDraft: any = { id: null, nombre: '', comuna: '', dependencia: '', presupuesto: null };
  tareaDraft: any = {
    id: null,
    title: '',
    employee_id: null,
    due_at: null,
    status: 'pending',
    priority: 'medium',
    entity_type: null,
    entity_id: null,
    entity_label: ''
  };
  rawProviders: any[] = [];
  leads: any[] = [];
  private readonly planLockedViews = new Set<DashboardView>([
    'sedes',
    'camas',
    'pacientes',
    'admisiones',
    'tareas',
    'empleados',
    'vouchers'
  ]);

  // Estadísticas generales
  totalSedes = 0;
  camasTotales = 0;
  camasOcupadas = 0;
  camasDisponibles = 0;
  camasEnMantenimiento = 0;
  porcentajeOcupacion = 0;

  // Configuración del gráfico de ocupación
  public doughnutChartLabels: string[] = ['Ocupadas', 'Disponibles', 'En mantenimiento'];
  public doughnutChartDatasets: ChartConfiguration<'doughnut'>['data']['datasets'] = [
    { data: [0, 0, 0], backgroundColor: ['#3b82f6', '#22c55e', '#f59e0b'] }
  ];
  public doughnutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11, family: "'DM Sans', sans-serif" } } } }
  };

  // Configuración del gráfico de admisiones (Leads)
  totalLeads = 0;
  public barChartLabels: string[] = ['Nuevas', 'Contact.', 'Eval.', 'Match', 'Cerrado', 'Perdido'];
  public barChartDatasets: ChartConfiguration<'bar'>['data']['datasets'] = [
    { data: [0, 0, 0, 0, 0, 0], backgroundColor: '#6366f1', borderRadius: 4 }
  ];
  public barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } },
      x: { grid: { display: false } }
    }
  };

  // Configuración del gráfico de tareas
  totalTareas = 0;
  public tasksChartLabels: string[] = ['Pendientes', 'En progreso', 'Completadas'];
  public tasksChartDatasets: ChartConfiguration<'doughnut'>['data']['datasets'] = [
    { data: [0, 0, 0], backgroundColor: ['#f59e0b', '#3b82f6', '#22c55e'] }
  ];
  public tasksChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 12, font: { size: 11, family: "'DM Sans', sans-serif" } }
      }
    }
  };

  taskSummaryCards: Array<{ label: string; value: number; tone: 'warn' | 'blue' | 'green' | 'neutral' }> = [];
  operationalAlerts: Array<{ level: 'high' | 'medium' | 'info'; title: string; detail: string }> = [];
  selectedEntityType: 'lead' | 'sede' | 'cama' | 'paciente' | null = null;
  selectedEntityId: string | null = null;
  taskFilters = {
    status: 'all',
    entityType: 'all'
  };
  configSearch = '';
  configSection: ConfigSection = 'appearance';
  configLoading = false;
  systemCategories: any[] = [];
  systemStatuses: any[] = [];
  emailTemplates: any[] = [];
  planSlas: any[] = [];
  businessParameters: any[] = [];
  companyDocuments: any[] = [];
  selectedDocumentFile: File | null = null;
  uploadingDocument = false;
  entityComments: any[] = [];
  onboardingProjects: any[] = [];
  onboardingSteps: any[] = [];
  companyInvitations: any[] = [];
  categoryDraft: any = { scope: 'task', name: '', color: '#f27a5e' };
  statusDraft: any = { scope: 'task', code: '', label: '', color: '#123c4a', is_terminal: false };
  emailTemplateDraft: any = { code: '', name: '', subject: '', body_html: '' };
  planSlaDraft: any = { plan_tier: '', request_response_hours: 24, task_due_hours: 72, escalation_hours: 96 };
  parameterDraft: any = { key: '', label: '', value: '', value_type: 'text', description: '' };
  documentDraft: any = { document_type: 'company_file', title: '', entity_type: 'company', storage_path: '' };
  commentDraft: any = { entity_type: 'company', entity_id: null, body: '', visibility: 'internal' };
  onboardingDraft: any = { title: 'Activación de empresa', starts_at: null };
  onboardingStepDraft: any = { project_id: null, title: '', description: '', step_key: '' };
  invitationDraft: any = { email: '', role: 'employee' };
  brandingDraft: any = {
    logo_url: '',
    primary_color: '#123c4a',
    secondary_color: '#f27a5e',
    erp_primary_color: '#123c4a',
    erp_accent_color: '#f27a5e',
    erp_background_color: '#f8fafc',
    erp_surface_color: '#ffffff',
    erp_text_color: '#0f172a',
    erp_button_style: 'solid',
    erp_radius: 'compact',
    erp_density: 'comfortable',
    erp_font_family: 'dm_sans'
  };

  // Lista de sedes de la empresa actual
  sedes: any[] = [];

  // Lista de camas para la vista de "Camas y Vacantes"
  camasDetalle: any[] = [];

  // Lista de tareas y empleados para la vista "Tareas"
  tareas: any[] = [];
  empleados: any[] = [];

  // Actividad reciente
  recentActivity: any[] = [];
  taskHistory: any[] = [];

  get filteredTareas() {
    return this.tareas.filter((tarea) => {
      const matchesStatus = this.taskFilters.status === 'all' || tarea.status === this.taskFilters.status;
      const matchesEntity = this.taskFilters.entityType === 'all' || (tarea.entity_type || 'none') === this.taskFilters.entityType;
      return matchesStatus && matchesEntity;
    });
  }

  get adminThemeVars() {
    const primary = this.normalizeHex(this.brandingDraft.erp_primary_color, '#123c4a');
    const accent = this.normalizeHex(this.brandingDraft.erp_accent_color, '#f27a5e');
    const background = this.normalizeHex(this.brandingDraft.erp_background_color, '#f8fafc');
    const surface = this.normalizeHex(this.brandingDraft.erp_surface_color, '#ffffff');
    const text = this.normalizeHex(this.brandingDraft.erp_text_color, '#0f172a');

    return {
      '--bg': background,
      '--bg2': surface,
      '--bg3': this.mixHex(background, surface, 0.55),
      '--bg4': this.mixHex(background, text, 0.12),
      '--border': this.mixHex(background, text, 0.14),
      '--border2': this.mixHex(background, text, 0.22),
      '--text': text,
      '--text2': this.mixHex(text, surface, 0.2),
      '--text3': this.mixHex(text, surface, 0.45),
      '--accent': primary,
      '--accent-dim': accent,
      '--accent-bg': this.hexToRgba(primary, 0.1),
      '--font-ui': this.resolveThemeFont()
    };
  }

  get adminThemeClasses() {
    return {
      'theme-buttons-soft': this.brandingDraft.erp_button_style === 'soft',
      'theme-buttons-outline': this.brandingDraft.erp_button_style === 'outline',
      'theme-radius-rounded': this.brandingDraft.erp_radius === 'rounded',
      'theme-radius-pill': this.brandingDraft.erp_radius === 'pill',
      'theme-density-compact': this.brandingDraft.erp_density === 'compact',
      'theme-density-spacious': this.brandingDraft.erp_density === 'spacious'
    };
  }

  // Extrae los pacientes activos a partir de las camas ocupadas
  get pacientesActivos() {
    return this.camasDetalle.filter(c => c.paciente && c.paciente.trim() !== '' && c.paciente !== '-');
  }

  // Extrae las camas que están disponibles para asignar un nuevo paciente
  get camasLibres() {
    return this.camasDetalle.filter(c => c.estado === 'Disponible');
  }

  get hasOperationalAccess(): boolean {
    return this.profileRole === 'admin' || this.hasActivePlan;
  }

  get planGateMessage(): string {
    return this.hasActivePlan
      ? `Plan activo: ${this.activePlanTier || 'empresa'}`
      : 'Contrata un plan para activar sedes, camas, pacientes, admisiones, tareas, empleados y vouchers.';
  }

  // --- Estado del tablero Kanban de Admisiones ---
  kanbanColumns: { id: LeadStatus; label: string }[] = [
    { id: 'nuevo', label: 'Nuevas Consultas' },
    { id: 'contactado', label: 'Contactado' },
    { id: 'evaluacion', label: 'Evaluación Clínica' },
    { id: 'match', label: 'Propuesta / Match' },
    { id: 'cerrado', label: 'Ingresado / Cerrado' },
    { id: 'perdido', label: 'Perdido' }
  ];
  // Usamos un Record para que sea más seguro y fácil de acceder
  kanbanData: Record<LeadStatus, any[]> = {
    nuevo: [], contactado: [], evaluacion: [], match: [], cerrado: [], perdido: []
  };

  constructor(
    private supabase: SupabaseService,
    private auth: AuthService,
    private route: ActivatedRoute
  ) {}

  async ngOnInit() {
    if (this.companyConfigMode) {
      this.configSection = 'company';
    }

    this.route.queryParamMap.subscribe((params) => {
      const requestedView = params.get('view') as any;
      if (requestedView) {
        this.currentView = requestedView;
      }
      this.selectedEntityType = (params.get('entityType') as any) || null;
      this.selectedEntityId = params.get('entityId');
    });
    await this.loadData();
  }

  async loadData() {
    this.loading = true;
    try {
      // 1. Obtener la sesión y usuario actual
      const { data: sessionData } = await this.supabase.client.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) return;

      const { data: profileData } = await this.supabase.client
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
      this.profileRole = (profileData?.role as string | undefined) ?? null;

      // 2. Obtener el company_id del usuario (para mostrar solo lo de su empresa)
      const { data: memberData } = await this.supabase.client
        .from('company_members')
        .select('company_id')
        .eq('user_id', userId)
        .maybeSingle();
      
      const companyId = memberData?.company_id;
      if (!companyId) {
        this.companyId = null;
        this.hasActivePlan = false;
        this.activePlanTier = null;
        this.sedes = [];
        this.camasDetalle = [];
        return;
      }
      this.companyId = companyId;

      const { data: activeSubscription } = await this.supabase.client
        .from('company_subscriptions')
        .select('plan_tier,status,current_period_end')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .or(`current_period_end.is.null,current_period_end.gte.${new Date().toISOString()}`)
        .order('current_period_end', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      this.hasActivePlan = !!activeSubscription;
      this.activePlanTier = (activeSubscription?.plan_tier as string | undefined) ?? null;

      if (this.isPlanLockedView(this.currentView)) {
        this.currentView = 'metricas';
      }

      // Cargar sedes (providers) de la empresa para que aparezcan en el selector, 
      // incluso si aún no tienen camas asignadas.
      const { data: providersData } = await this.supabase.client
        .from('providers')
        .select('*')
        .eq('company_id', companyId);
      this.rawProviders = providersData || [];

      // 3. Obtener los cupos/camas de la empresa junto a la info de su sede (provider)
      const { data: resources } = await this.supabase.client
        .from('care_resources')
        .select('*, provider:providers(id, name, area)')
        .eq('company_id', companyId);

      const resArray = resources || [];

      // 4. Mapear care_resources para la tabla "Camas y Vacantes"
      this.camasDetalle = resArray.map(r => ({
        dbId: r.id,
        provider_id: r.provider_id,
        id: r.resource_code,
        sede: (r.provider as any)?.name || r.location_label || 'Sede no especificada',
        tipo: r.care_type,
        estado: r.status,
        paciente: r.notes || '-'
      }));

      // 5. Agrupar las camas por Proveedor/Sede para armar la tabla "Mis Sedes"
      const sedesMap = new Map<string, any>();
      
      // Inicializar el mapa con las sedes vacías
      this.rawProviders.forEach(p => {
        sedesMap.set(p.id, {
          id: p.id,
          nombre: p.name,
          ubicacion: p.area || 'Sin ubicación',
          camasTotales: 0,
          camasDisponibles: 0
        });
      });

      resArray.forEach(r => {
        const provId = r.provider_id || r.location_label || 'unknown';
        if (!sedesMap.has(provId)) {
          sedesMap.set(provId, {
            id: provId,
            nombre: (r.provider as any)?.name || r.location_label || 'Sede sin nombre',
            ubicacion: (r.provider as any)?.area || 'Sin ubicación',
            camasTotales: 0,
            camasDisponibles: 0
          });
        }
        const sede = sedesMap.get(provId);
        sede.camasTotales++;
        if (r.status === 'Disponible') {
          sede.camasDisponibles++;
        }
      });

      // Asignar estado a las sedes dependiendo de sus cupos
      this.sedes = Array.from(sedesMap.values()).map(s => {
        let estado = 'Normal';
        
        if (s.camasTotales > 0 && s.camasDisponibles === 0) estado = 'Crítico';
        else if (s.camasTotales > 0 && (s.camasDisponibles / s.camasTotales) <= 0.3) estado = 'Atención';
        
        return { ...s, estado };
      });

      // 6. Cálculos dinámicos de estadísticas generales
      this.totalSedes = this.sedes.length;
      this.camasTotales = resArray.length;
      this.camasDisponibles = resArray.filter(r => r.status === 'Disponible').length;
      this.camasOcupadas = resArray.filter(r => r.status === 'Ocupada').length;
      this.camasEnMantenimiento = resArray.filter(r => r.status === 'En limpieza').length;
      
      this.porcentajeOcupacion = this.camasTotales > 0 
        ? Number(((this.camasOcupadas / this.camasTotales) * 100).toFixed(1)) 
        : 0;

      // Actualizar datos del gráfico
      this.doughnutChartDatasets = [
        {
          data: [this.camasOcupadas, this.camasDisponibles, this.camasEnMantenimiento],
          backgroundColor: ['#3b82f6', '#22c55e', '#f59e0b']
        }
      ];

      // 7. Cargar Leads para el Kanban de Admisiones
      const { data: leadsData, error: leadsError } = await this.supabase.client
        .from('leads')
        .select('*')
        .eq('company_id', companyId);

      if (leadsError) throw leadsError;
      this.leads = leadsData || [];

      // Inicializar/limpiar el contenedor de datos del kanban
      this.kanbanColumns.forEach(col => this.kanbanData[col.id] = []);

      // Agrupar leads en sus columnas correspondientes
      this.leads.forEach(lead => {
        const status = lead.estado as LeadStatus;
        if (this.kanbanData[status]) {
          this.kanbanData[status].push(lead);
        } else {
          this.kanbanData['nuevo'].push(lead); // Fallback a 'nuevo' si el estado es inválido
        }
      });

      // Actualizar datos del gráfico de barras
      this.totalLeads = this.leads.length;
      this.barChartDatasets = [
        {
          data: [
            this.kanbanData['nuevo'].length,
            this.kanbanData['contactado'].length,
            this.kanbanData['evaluacion'].length,
            this.kanbanData['match'].length,
            this.kanbanData['cerrado'].length,
            this.kanbanData['perdido'].length
          ],
          // Usamos colores similares a los badges de cada estado en el Kanban
          backgroundColor: ['#f59e0b', '#3b82f6', '#94a3b8', '#3b82f6', '#22c55e', '#ef4444'],
          borderRadius: 4
        }
      ];

      // 8. Cargar Empleados para selectores
      const { data: membersData, error: membersError } = await this.supabase.client
        .from('company_members')
        .select('user_id, profiles(full_name, email)')
        .eq('company_id', companyId);
      
      if (membersError) console.warn('No se pudieron cargar los empleados:', membersError.message);
      this.empleados = (membersData || []).map(m => ({
        id: m.user_id,
        name: (m.profiles as any)?.full_name || m.user_id,
        email: (m.profiles as any)?.email || ''
      }));

      // 9. Cargar Tareas
      const employeeIds = this.empleados.map(e => e.id);
      let tasksData: any[] = [];
      
      if (employeeIds.length > 0) {
        const res = await this.supabase.client
          .from('care_tasks')
          .select('*, assigned:profiles!employee_id(full_name, email)')
          .in('employee_id', employeeIds)
          .order('created_at', { ascending: false });
        tasksData = res.data || [];
        if (res.error) console.warn('Error cargando tareas:', res.error);
      }
      this.tareas = tasksData || [];
      this.totalTareas = this.tareas.length;
      this.tasksChartDatasets = [
        {
          data: [
            this.tareas.filter(t => t.status === 'pending').length,
            this.tareas.filter(t => t.status === 'in_progress').length,
            this.tareas.filter(t => t.status === 'done').length
          ],
          backgroundColor: ['#f59e0b', '#3b82f6', '#22c55e']
        }
      ];
      this.buildOperationalSummary();

      if (this.tareas.length > 0) {
        const { data: taskHistoryData, error: taskHistoryError } = await this.supabase.client
          .from('care_task_history')
          .select('*, author:profiles!changed_by(full_name, email)')
          .in('task_id', this.tareas.map((task) => task.id))
          .order('created_at', { ascending: false })
          .limit(10);

        if (taskHistoryError) {
          console.warn('Error cargando historial de tareas:', taskHistoryError);
        }
        this.taskHistory = taskHistoryData || [];
      } else {
        this.taskHistory = [];
      }
      await this.loadErpOperationalModules(companyId);

    } catch (error) {
      console.error('Error cargando datos del dashboard:', error);
    } finally {
      this.loading = false;
    }
  }
  
  // Evento Drag & Drop del Kanban
  async dropKanban(event: CdkDragDrop<any[]>) {
    if (!this.ensureOperationalAccess()) return;
    if (event.previousContainer === event.container) {
      // Mover dentro de la misma columna (reordenar)
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Mover a otra columna (y actualizar estado)
      const newStatus = event.container.id as LeadStatus;
      const movedItem = event.item.data;

      // 1. Actualizar el estado en Supabase
      const { error } = await this.supabase.client
        .from('leads')
        .update({ estado: newStatus })
        .eq('id', movedItem.id);

      if (error) {
        console.error('Error actualizando el estado del lead:', error);
        alert('No se pudo mover el lead. Revisa la consola para más detalles.');
        // No hacemos el transfer si falla la BD para mantener la UI consistente con la data.
        return;
      }
      
      // 2. Si la BD se actualizó, movemos el item en la UI
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    }
  }

  trackByKanbanColumn = (_index: number, column: { id: LeadStatus }) => column.id;

  trackByLead = (_index: number, lead: { id?: string | number }) => lead.id ?? _index;

  getTimeAgo(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return `Hace ${interval} año${interval === 1 ? '' : 's'}`;
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return `Hace ${interval} mes${interval === 1 ? '' : 'es'}`;
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return `Hace ${interval} día${interval === 1 ? '' : 's'}`;
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return `Hace ${interval} hora${interval === 1 ? '' : 's'}`;
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return `Hace ${interval} minuto${interval === 1 ? '' : 's'}`;
    return 'Hace unos segundos';
  }

  exportActivityToCSV() {
    if (!this.recentActivity || this.recentActivity.length === 0) {
      alert('No hay datos de actividad para exportar.');
      return;
    }

    // 1. Crear los encabezados
    let csvContent = 'Fecha,Usuario,Evento\n';

    // 2. Formatear cada fila de datos
    this.recentActivity.forEach(act => {
      const fecha = new Date(act.created_at).toLocaleString('es-CL');
      const usuario = act.profiles?.full_name || 'Usuario desconocido';
      const evento = act.event_name || 'Sin evento';
      
      // Escapar texto por si contiene comas o comillas
      const escapeCSV = (str: string) => `"${str.replace(/"/g, '""')}"`;
      csvContent += `${escapeCSV(fecha)},${escapeCSV(usuario)},${escapeCSV(evento)}\n`;
    });

    // 3. Crear el archivo y forzar la descarga (BOM \ufeff asegura que Excel lea bien los acentos)
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `actividad_reciente_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  isPlanLockedView(view: DashboardView): boolean {
    return this.planLockedViews.has(view) && !this.hasOperationalAccess;
  }

  setView(view: DashboardView) {
    if (this.isPlanLockedView(view)) {
      alert('Necesitas un plan activo para usar este modulo.');
      return;
    }
    this.currentView = view;
    this.clearSelectedEntity();
  }

  private ensureOperationalAccess(): boolean {
    if (this.hasOperationalAccess) return true;
    alert('Necesitas un plan activo para realizar esta accion.');
    return false;
  }

  private buildOperationalSummary() {
    const now = new Date();
    const pendingTasks = this.tareas.filter(t => t.status === 'pending');
    const inProgressTasks = this.tareas.filter(t => t.status === 'in_progress');
    const doneTasks = this.tareas.filter(t => t.status === 'done');
    const overdueTasks = this.tareas.filter(t => {
      if (!t.due_at || t.status === 'done') return false;
      return new Date(t.due_at) < now;
    });

    this.taskSummaryCards = [
      { label: 'Tareas pendientes', value: pendingTasks.length, tone: 'warn' },
      { label: 'En progreso', value: inProgressTasks.length, tone: 'blue' },
      { label: 'Completadas', value: doneTasks.length, tone: 'green' },
      { label: 'Vencidas', value: overdueTasks.length, tone: 'neutral' }
    ];

    const alerts: Array<{ level: 'high' | 'medium' | 'info'; title: string; detail: string }> = [];

    if (overdueTasks.length > 0) {
      alerts.push({
        level: 'high',
        title: 'Tareas vencidas',
        detail: `${overdueTasks.length} tarea${overdueTasks.length === 1 ? '' : 's'} requiere${overdueTasks.length === 1 ? '' : 'n'} atención inmediata.`
      });
    }

    if (this.camasTotales > 0 && this.camasDisponibles === 0) {
      alerts.push({
        level: 'high',
        title: 'Sin camas disponibles',
        detail: 'La ocupación está al máximo y no hay vacantes libres para nuevas admisiones.'
      });
    } else if (this.camasTotales > 0 && this.camasDisponibles <= 2) {
      alerts.push({
        level: 'medium',
        title: 'Disponibilidad baja',
        detail: `Quedan ${this.camasDisponibles} camas disponibles en toda la operación.`
      });
    }

    const newLeads = this.kanbanData['nuevo']?.length || 0;
    if (newLeads > 0) {
      alerts.push({
        level: newLeads >= 3 ? 'medium' : 'info',
        title: 'Consultas por contactar',
        detail: `${newLeads} lead${newLeads === 1 ? '' : 's'} sigue${newLeads === 1 ? '' : 'n'} en etapa inicial.`
      });
    }

    if (this.camasEnMantenimiento > 0) {
      alerts.push({
        level: 'info',
        title: 'Camas fuera de servicio',
        detail: `${this.camasEnMantenimiento} cama${this.camasEnMantenimiento === 1 ? '' : 's'} está${this.camasEnMantenimiento === 1 ? '' : 'n'} en limpieza o mantención.`
      });
    }

    this.operationalAlerts = alerts.length
      ? alerts
      : [{
          level: 'info',
          title: 'Operación estable',
          detail: 'No hay alertas críticas. La operación se ve dentro de parámetros normales.'
        }];
  }

  openLeadModal(lead?: any) {
    if (!this.ensureOperationalAccess()) return;
    if (lead) {
      // Para editar (aunque el botón actual es solo para crear)
      this.leadDraft = { 
        id: lead.id, 
        nombre: lead.nombre, 
        comuna: lead.comuna, 
        dependencia: lead.dependencia,
        presupuesto: lead.presupuesto
      };
    } else {
      // Para crear
      this.leadDraft = { id: null, nombre: '', comuna: '', dependencia: '', presupuesto: null };
    }
    this.showLeadModal = true;
  }

  async saveLead() {
    if (!this.ensureOperationalAccess()) return;
    if (!this.companyId || !this.leadDraft.nombre?.trim()) {
      alert('El nombre del prospecto es obligatorio.');
      return;
    }
    this.savingLead = true;
    try {
      const payload: any = {
        company_id: this.companyId,
        nombre: this.leadDraft.nombre,
        comuna: this.leadDraft.comuna || null,
        dependencia: this.leadDraft.dependencia || null,
        presupuesto: this.leadDraft.presupuesto || null,
        estado: 'nuevo' // Las nuevas consultas siempre empiezan en la columna 'nuevo'
      };

      const { error } = await this.supabase.client.from('leads').insert(payload);
      if (error) throw error;

      this.showLeadModal = false;
      await this.loadData();
    } catch (error) {
      console.error('Error guardando la consulta/lead:', error);
      alert('No se pudo guardar la consulta. Revisa la consola para más detalles.');
    } finally {
      this.savingLead = false;
    }
  }

  openSedeModal(sede?: any) {
    if (!this.ensureOperationalAccess()) return;
    if (sede) {
      this.sedeDraft = { id: sede.id, nombre: sede.nombre, ubicacion: sede.ubicacion };
    } else {
      this.sedeDraft = { id: null, nombre: '', ubicacion: '' };
    }
    this.showSedeModal = true;
  }

  async saveSede() {
    if (!this.ensureOperationalAccess()) return;
    if (!this.companyId || !this.sedeDraft.nombre) return;
    this.savingSede = true;
    try {
      let error;
      if (this.sedeDraft.id) {
        const res = await this.supabase.client.from('providers').update({
          name: this.sedeDraft.nombre,
          area: this.sedeDraft.ubicacion
        }).eq('id', this.sedeDraft.id);
        error = res.error;
      } else {
        const res = await this.supabase.client.from('providers').insert({
          company_id: this.companyId,
          name: this.sedeDraft.nombre,
          area: this.sedeDraft.ubicacion,
          type: 'Residencia'
        });
        error = res.error;
      }
      if (error) throw error;
      this.showSedeModal = false;
      await this.loadData();
    } catch (error) {
      console.error('Error guardando sede:', error);
      alert('Error al guardar la sede. Revisa la conexión con Supabase.');
    } finally {
      this.savingSede = false;
    }
  }

  async deleteSede(sede: any) {
    if (!this.ensureOperationalAccess()) return;
    if (!confirm(`¿Estás seguro de eliminar la sede "${sede.nombre}"?`)) return;
    try {
      const { error } = await this.supabase.client.from('providers').delete().eq('id', sede.id);
      if (error) throw error;
      await this.loadData();
    } catch (error: any) {
      console.error('Error eliminando sede:', error);
      alert('Error al eliminar la sede. Verifica que no tenga camas asociadas.');
    }
  }

  openCamaModal(cama?: any) {
    if (!this.ensureOperationalAccess()) return;
    if (cama) {
      // Mapeo inverso de Base de Datos -> Formulario
      let formCareType = 'Básico';
      if (cama.tipo === 'Post-operatorio') formCareType = 'Intermedio';
      if (cama.tipo === 'Intensivo') formCareType = 'Intensivo';

      this.camaDraft = {
        db_id: cama.dbId,
        resource_code: cama.id,
        provider_id: cama.provider_id,
        care_type: formCareType,
        status: cama.estado === 'Ocupada' ? 'Ocupada' : cama.estado === 'En limpieza' ? 'En limpieza' : 'Disponible',
        notes: cama.paciente !== '-' ? cama.paciente : ''
      };
    } else {
      this.camaDraft = { db_id: null, resource_code: '', provider_id: '', care_type: 'Básico', status: 'Disponible', notes: '' };
    }
    this.showCamaModal = true;
  }

  async saveCama() {
    if (!this.ensureOperationalAccess()) return;
    if (!this.companyId || !this.camaDraft.resource_code || !this.camaDraft.provider_id) {
      alert('Por favor ingresa un ID y selecciona una sede.');
      return;
    }
    this.savingCama = true;
    try {
      // Buscamos el nombre de la sede seleccionada para guardarlo como location_label
      const selectedSede = this.sedes.find(s => s.id === this.camaDraft.provider_id);
      const locationLabel = selectedSede ? selectedSede.nombre : 'Sede principal';

      // Mapear los valores del formulario a los valores EXACTOS de tu base de datos
      const careTypeMap: Record<string, string> = {
        'Básico': 'Basico', // Sin tilde, como exige tu BD
        'Intermedio': 'Post-operatorio', // Tu BD no tiene "Intermedio", usamos Post-operatorio
        'Intensivo': 'Intensivo'
      };
      const statusMap: Record<string, string> = {
        'Disponible': 'Disponible',
        'Ocupada': 'Ocupada',
        'En limpieza': 'En limpieza',
        'Mantenimiento': 'En limpieza' // Tu BD no tiene "Mantenimiento", lo asignamos a limpieza
      };

      const payload = {
        company_id: this.companyId,
        resource_code: this.camaDraft.resource_code,
        provider_id: this.camaDraft.provider_id,
        location_label: locationLabel,
        care_type: careTypeMap[this.camaDraft.care_type] || 'Basico',
        status: statusMap[this.camaDraft.status] || 'Disponible',
        notes: this.camaDraft.notes
      };

      let error;
      if (this.camaDraft.db_id) {
        const res = await this.supabase.client.from('care_resources').update(payload).eq('id', this.camaDraft.db_id);
        error = res.error;
      } else {
        const res = await this.supabase.client.from('care_resources').insert(payload);
        error = res.error;
      }
      if (error) throw error;
      this.showCamaModal = false;
      await this.loadData();
    } catch (error) {
      console.error('Error guardando cama:', error);
      alert('Error al guardar la cama.');
    } finally {
      this.savingCama = false;
    }
  }

  async deleteCama(cama: any) {
    if (!this.ensureOperationalAccess()) return;
    if (!confirm(`¿Estás seguro de eliminar la cama/vacante "${cama.id}"?`)) return;
    try {
      const { error } = await this.supabase.client.from('care_resources').delete().eq('id', cama.dbId);
      if (error) throw error;
      await this.loadData();
    } catch (error: any) {
      console.error('Error eliminando cama:', error);
      alert('Error al eliminar la cama.');
    }
  }

  // --- GESTIÓN DE PACIENTES ---

  openNewPacienteModal() {
    if (!this.ensureOperationalAccess()) return;
    this.pacienteDraft = {
      db_id: null,
      cama_id: null,
      sede: '',
      nombre_paciente: ''
    };
    this.showPacienteModal = true;
  }

  openPacienteModal(cama: any) {
    if (!this.ensureOperationalAccess()) return;
    this.pacienteDraft = {
      db_id: cama.dbId,
      cama_id: cama.id,
      sede: cama.sede,
      nombre_paciente: cama.paciente !== '-' ? cama.paciente : ''
    };
    this.showPacienteModal = true;
  }

  async savePaciente() {
    if (!this.ensureOperationalAccess()) return;
    if (!this.pacienteDraft.db_id) {
      alert('Por favor selecciona una cama disponible.');
      return;
    }
    this.savingPaciente = true;
    
    try {
      // Actualizamos las notas (donde guardamos el paciente) y marcamos la cama como Ocupada si hay nombre
      const newStatus = this.pacienteDraft.nombre_paciente.trim() ? 'Ocupada' : 'Disponible';
      
      const { error } = await this.supabase.client.from('care_resources').update({
        notes: this.pacienteDraft.nombre_paciente,
        status: newStatus
      }).eq('id', this.pacienteDraft.db_id);

      if (error) throw error;
      
      this.showPacienteModal = false;
      await this.loadData();
    } catch (error) {
      console.error('Error guardando paciente:', error);
      alert('Error al guardar los datos del paciente.');
    } finally {
      this.savingPaciente = false;
    }
  }

  // --- GESTIÓN DE TAREAS ---

  openTareaModal(tarea?: any) {
    if (!this.ensureOperationalAccess()) return;
    if (tarea) {
      this.tareaDraft = { 
        id: tarea.id,
        title: tarea.title,
        employee_id: tarea.employee_id,
        due_at: tarea.due_at ? new Date(tarea.due_at).toISOString().split('T')[0] : null,
        status: tarea.status,
        priority: tarea.priority || 'medium',
        entity_type: tarea.entity_type || null,
        entity_id: tarea.entity_id || null,
        entity_label: tarea.entity_label || ''
      };
    } else {
      this.tareaDraft = {
        id: null,
        title: '',
        employee_id: null,
        due_at: null,
        status: 'pending',
        priority: 'medium',
        entity_type: null,
        entity_id: null,
        entity_label: ''
      };
    }
    this.showTareaModal = true;
  }

  async saveTarea() {
    if (!this.ensureOperationalAccess()) return;
    if (!this.tareaDraft.title?.trim() || !this.tareaDraft.employee_id) {
      alert('El título de la tarea y el empleado asignado son obligatorios.');
      return;
    }
    this.savingTarea = true;
    try {
      const payload: any = {
        title: this.tareaDraft.title,
        employee_id: this.tareaDraft.employee_id,
        due_at: this.tareaDraft.due_at || null,
        status: this.tareaDraft.status || 'pending',
        priority: this.tareaDraft.priority || 'medium',
        entity_type: this.tareaDraft.entity_type || null,
        entity_id: this.tareaDraft.entity_id || null,
        entity_label: this.resolveTaskEntityLabel()
      };

      let error;
      if (this.tareaDraft.id) {
        const res = await this.supabase.client.from('care_tasks').update(payload).eq('id', this.tareaDraft.id);
        error = res.error;
      } else {
        payload.created_by = this.auth.user?.id; // Obligatorio al crear
        const res = await this.supabase.client.from('care_tasks').insert(payload);
        error = res.error;
      }

      if (error) throw error;

      this.showTareaModal = false;
      await this.loadData();
    } catch (error) {
      console.error('Error guardando la tarea:', error);
      alert(`No se pudo guardar la tarea. Revisa la consola para más detalles. Error: ${(error as any).message}`);
    } finally {
      this.savingTarea = false;
    }
  }

  async deleteTarea(tarea: any) {
    if (!this.ensureOperationalAccess()) return;
    if (!confirm(`¿Estás seguro de eliminar esta tarea?`)) return;
    const { error } = await this.supabase.client.from('care_tasks').delete().eq('id', tarea.id);
    if (error) alert('Error al eliminar la tarea.');
    else await this.loadData();
  }
  onTaskEntityTypeChange() {
    this.tareaDraft.entity_id = null;
    this.tareaDraft.entity_label = '';
  }

  onTaskEntitySelectionChange() {
    this.tareaDraft.entity_label = this.resolveTaskEntityLabel() || '';
  }

  getTaskEntityOptions() {
    switch (this.tareaDraft.entity_type) {
      case 'lead':
        return this.leads.map(lead => ({
          id: lead.id,
          label: `${lead.nombre}${lead.comuna ? ' · ' + lead.comuna : ''}`
        }));
      case 'sede':
        return this.sedes.map(sede => ({
          id: sede.id,
          label: `${sede.nombre}${sede.ubicacion ? ' · ' + sede.ubicacion : ''}`
        }));
      case 'cama':
        return this.camasDetalle.map(cama => ({
          id: cama.dbId,
          label: `${cama.id} · ${cama.sede}`
        }));
      case 'paciente':
        return this.pacientesActivos.map(cama => ({
          id: cama.dbId,
          label: `${cama.paciente} · ${cama.sede}`
        }));
      default:
        return [];
    }
  }

  private resolveTaskEntityLabel(): string | null {
    if (!this.tareaDraft.entity_type || !this.tareaDraft.entity_id) return null;
    const selected = this.getTaskEntityOptions().find((option: any) => option.id === this.tareaDraft.entity_id);
    return selected?.label || this.tareaDraft.entity_label || null;
  }

  isSelectedEntity(type: 'lead' | 'sede' | 'cama' | 'paciente', id: string | null | undefined) {
    return this.selectedEntityType === type && !!id && this.selectedEntityId === id;
  }

  clearSelectedEntity() {
    this.selectedEntityType = null;
    this.selectedEntityId = null;
  }

  async loadErpOperationalModules(companyId = this.companyId) {
    if (!companyId) return;
    this.configLoading = true;
    try {
      const [
        categoriesRes,
        statusesRes,
        templatesRes,
        slasRes,
        paramsRes,
        documentsRes,
        commentsRes,
        onboardingRes,
        invitationsRes,
        brandingRes
      ] = await Promise.all([
        this.supabase.client.from('system_categories').select('*').eq('company_id', companyId).order('sort_order'),
        this.supabase.client.from('system_statuses').select('*').eq('company_id', companyId).order('sort_order'),
        this.supabase.client.from('email_templates').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
        this.supabase.client.from('plan_slas').select('*').eq('company_id', companyId).order('plan_tier'),
        this.supabase.client.from('business_parameters').select('*').eq('company_id', companyId).order('key'),
        this.supabase.client.from('company_documents').select('*, uploaded:profiles!uploaded_by(full_name, email)').eq('company_id', companyId).order('created_at', { ascending: false }),
        this.supabase.client.from('entity_comments').select('*, author:profiles!created_by(full_name, email)').eq('company_id', companyId).order('created_at', { ascending: false }).limit(20),
        this.supabase.client.from('onboarding_projects').select('*, owner:profiles!owner_id(full_name, email), steps:onboarding_steps(*)').eq('company_id', companyId).order('created_at', { ascending: false }),
        this.supabase.client.from('company_invitations').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
        this.supabase.client.from('company_branding').select('*').eq('company_id', companyId).maybeSingle()
      ]);

      const results = [categoriesRes, statusesRes, templatesRes, slasRes, paramsRes, documentsRes, commentsRes, onboardingRes, invitationsRes, brandingRes];
      const failed = results.find((result) => result.error);
      if (failed?.error) {
        console.warn('Algunos módulos ERP aún no están disponibles. ¿Aplicaste la migración 020?', failed.error.message);
      }

      this.systemCategories = categoriesRes.data || [];
      this.systemStatuses = statusesRes.data || [];
      this.emailTemplates = templatesRes.data || [];
      this.planSlas = slasRes.data || [];
      this.businessParameters = paramsRes.data || [];
      this.companyDocuments = documentsRes.data || [];
      this.entityComments = commentsRes.data || [];
      this.onboardingProjects = onboardingRes.data || [];
      this.onboardingSteps = this.onboardingProjects.flatMap((project) => project.steps || []);
      this.companyInvitations = invitationsRes.data || [];
      if (brandingRes.data) {
        this.brandingDraft = { ...this.brandingDraft, ...brandingRes.data };
      }
    } finally {
      this.configLoading = false;
    }
  }

  get filteredConfigRows() {
    const term = this.configSearch.trim().toLowerCase();
    const groups = [
      ...this.systemCategories.map(item => ({ type: 'Categoría', title: item.name, detail: item.scope })),
      ...this.systemStatuses.map(item => ({ type: 'Estado', title: item.label, detail: item.scope })),
      ...this.emailTemplates.map(item => ({ type: 'Email', title: item.name, detail: item.subject })),
      ...this.planSlas.map(item => ({ type: 'SLA', title: item.plan_tier, detail: `${item.request_response_hours}h respuesta` })),
      ...this.businessParameters.map(item => ({ type: 'Parámetro', title: item.label, detail: item.key })),
      ...this.companyDocuments.map(item => ({ type: 'Documento', title: item.title, detail: item.document_type })),
      ...this.companyInvitations.map(item => ({ type: 'Invitación', title: item.email, detail: item.status }))
    ];
    if (!term) return groups.slice(0, 12);
    return groups.filter(row =>
      `${row.type} ${row.title} ${row.detail}`.toLowerCase().includes(term)
    ).slice(0, 20);
  }

  applyThemePreset(preset: 'care' | 'clinical' | 'corporate' | 'warm') {
    const presets = {
      care: {
        erp_primary_color: '#123c4a',
        erp_accent_color: '#f27a5e',
        erp_background_color: '#f8fafc',
        erp_surface_color: '#ffffff',
        erp_text_color: '#0f172a',
        erp_button_style: 'solid',
        erp_radius: 'compact',
        erp_density: 'comfortable'
      },
      clinical: {
        erp_primary_color: '#0f766e',
        erp_accent_color: '#14b8a6',
        erp_background_color: '#f0fdfa',
        erp_surface_color: '#ffffff',
        erp_text_color: '#134e4a',
        erp_button_style: 'soft',
        erp_radius: 'rounded',
        erp_density: 'comfortable'
      },
      corporate: {
        erp_primary_color: '#1d4ed8',
        erp_accent_color: '#0f172a',
        erp_background_color: '#f8fafc',
        erp_surface_color: '#ffffff',
        erp_text_color: '#111827',
        erp_button_style: 'outline',
        erp_radius: 'compact',
        erp_density: 'compact'
      },
      warm: {
        erp_primary_color: '#9a3412',
        erp_accent_color: '#ea580c',
        erp_background_color: '#fff7ed',
        erp_surface_color: '#ffffff',
        erp_text_color: '#1f2937',
        erp_button_style: 'solid',
        erp_radius: 'rounded',
        erp_density: 'spacious'
      }
    };
    this.brandingDraft = { ...this.brandingDraft, ...presets[preset] };
  }

  async saveBranding() {
    if (!this.companyId) return;
    const payload = {
      company_id: this.companyId,
      logo_url: this.brandingDraft.logo_url || null,
      primary_color: this.brandingDraft.erp_primary_color || this.brandingDraft.primary_color,
      secondary_color: this.brandingDraft.erp_accent_color || this.brandingDraft.secondary_color,
      erp_primary_color: this.normalizeHex(this.brandingDraft.erp_primary_color, '#123c4a'),
      erp_accent_color: this.normalizeHex(this.brandingDraft.erp_accent_color, '#f27a5e'),
      erp_background_color: this.normalizeHex(this.brandingDraft.erp_background_color, '#f8fafc'),
      erp_surface_color: this.normalizeHex(this.brandingDraft.erp_surface_color, '#ffffff'),
      erp_text_color: this.normalizeHex(this.brandingDraft.erp_text_color, '#0f172a'),
      erp_button_style: this.brandingDraft.erp_button_style || 'solid',
      erp_radius: this.brandingDraft.erp_radius || 'compact',
      erp_density: this.brandingDraft.erp_density || 'comfortable',
      erp_font_family: this.brandingDraft.erp_font_family || 'dm_sans'
    };
    const { error } = await this.supabase.client.from('company_branding').upsert(payload, { onConflict: 'company_id' });
    if (error) return alert('No se pudo guardar la apariencia del ERP.');
    this.brandingDraft = { ...this.brandingDraft, ...payload };
    alert('Apariencia guardada.');
  }

  async addCategory() {
    if (!this.companyId || !this.categoryDraft.name?.trim()) return;
    const { error } = await this.supabase.client.from('system_categories').insert({
      company_id: this.companyId,
      scope: this.categoryDraft.scope,
      name: this.categoryDraft.name.trim(),
      color: this.categoryDraft.color || null,
      created_by: this.auth.user?.id
    });
    if (error) return alert('No se pudo crear la categoría.');
    this.categoryDraft.name = '';
    await this.loadErpOperationalModules();
  }

  async addStatus() {
    if (!this.companyId || !this.statusDraft.code?.trim() || !this.statusDraft.label?.trim()) return;
    const { error } = await this.supabase.client.from('system_statuses').insert({
      company_id: this.companyId,
      scope: this.statusDraft.scope,
      code: this.statusDraft.code.trim().toLowerCase().replace(/\s+/g, '_'),
      label: this.statusDraft.label.trim(),
      color: this.statusDraft.color || null,
      is_terminal: !!this.statusDraft.is_terminal,
      created_by: this.auth.user?.id
    });
    if (error) return alert('No se pudo crear el estado.');
    this.statusDraft.code = '';
    this.statusDraft.label = '';
    this.statusDraft.is_terminal = false;
    await this.loadErpOperationalModules();
  }

  async addEmailTemplate() {
    if (!this.companyId || !this.emailTemplateDraft.code || !this.emailTemplateDraft.subject) return;
    const { error } = await this.supabase.client.from('email_templates').insert({
      company_id: this.companyId,
      code: this.emailTemplateDraft.code.trim().toLowerCase().replace(/\s+/g, '_'),
      name: this.emailTemplateDraft.name || this.emailTemplateDraft.code,
      subject: this.emailTemplateDraft.subject,
      body_html: this.emailTemplateDraft.body_html || '<p></p>',
      created_by: this.auth.user?.id
    });
    if (error) return alert('No se pudo crear la plantilla.');
    this.emailTemplateDraft = { code: '', name: '', subject: '', body_html: '' };
    await this.loadErpOperationalModules();
  }

  async addPlanSla() {
    if (!this.companyId || !this.planSlaDraft.plan_tier?.trim()) return;
    const { error } = await this.supabase.client.from('plan_slas').insert({
      company_id: this.companyId,
      plan_tier: this.planSlaDraft.plan_tier.trim(),
      request_response_hours: Number(this.planSlaDraft.request_response_hours) || 24,
      task_due_hours: Number(this.planSlaDraft.task_due_hours) || 72,
      escalation_hours: Number(this.planSlaDraft.escalation_hours) || 96,
      created_by: this.auth.user?.id
    });
    if (error) return alert('No se pudo crear el SLA.');
    this.planSlaDraft = { plan_tier: '', request_response_hours: 24, task_due_hours: 72, escalation_hours: 96 };
    await this.loadErpOperationalModules();
  }

  async addBusinessParameter() {
    if (!this.companyId || !this.parameterDraft.key?.trim()) return;
    let value: any = this.parameterDraft.value;
    if (this.parameterDraft.value_type === 'number') value = Number(value || 0);
    if (this.parameterDraft.value_type === 'boolean') value = value === true || value === 'true';
    if (this.parameterDraft.value_type === 'json') {
      try {
        value = JSON.parse(value || '{}');
      } catch {
        alert('El valor JSON no es válido.');
        return;
      }
    }
    const { error } = await this.supabase.client.from('business_parameters').insert({
      company_id: this.companyId,
      key: this.parameterDraft.key.trim(),
      label: this.parameterDraft.label || this.parameterDraft.key,
      value,
      value_type: this.parameterDraft.value_type,
      description: this.parameterDraft.description || null,
      created_by: this.auth.user?.id
    });
    if (error) return alert('No se pudo guardar el parámetro.');
    this.parameterDraft = { key: '', label: '', value: '', value_type: 'text', description: '' };
    await this.loadErpOperationalModules();
  }

  onDocumentFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file) {
      const allowedTypes = new Set([
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'image/png',
        'image/jpeg'
      ]);
      const maxBytes = 12 * 1024 * 1024;
      if (!allowedTypes.has(file.type)) {
        input.value = '';
        this.selectedDocumentFile = null;
        return alert('Tipo de archivo no permitido. Usa PDF, Excel, Word, PNG o JPG.');
      }
      if (file.size > maxBytes) {
        input.value = '';
        this.selectedDocumentFile = null;
        return alert('El archivo supera 12 MB.');
      }
    }
    this.selectedDocumentFile = file;
    if (file && !this.documentDraft.title?.trim()) {
      this.documentDraft.title = file.name.replace(/\.[^/.]+$/, '');
    }
  }

  async addDocumentRecord() {
    if (!this.companyId || !this.documentDraft.title?.trim()) return;
    if (this.companyConfigMode && !this.selectedDocumentFile) {
      return alert('Selecciona un archivo para subir.');
    }
    this.uploadingDocument = true;

    let storagePath = this.documentDraft.storage_path || null;
    const file = this.selectedDocumentFile;

    if (file) {
      const safeName = file.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();
      storagePath = `${this.companyId}/${Date.now()}-${safeName || 'documento'}`;
      const { error: uploadError } = await this.supabase.client.storage
        .from('company-documents')
        .upload(storagePath, file, {
          cacheControl: '3600',
          contentType: file.type || undefined,
          upsert: false
        });

      if (uploadError) {
        this.uploadingDocument = false;
        return alert('No se pudo subir el archivo.');
      }
    }

    const { error } = await this.supabase.client.from('company_documents').insert({
      company_id: this.companyId,
      document_type: this.documentDraft.document_type,
      entity_type: this.documentDraft.entity_type || 'company',
      title: this.documentDraft.title.trim(),
      storage_path: storagePath,
      file_name: file?.name || (storagePath ? storagePath.split('/').pop() : null),
      mime_type: file?.type || null,
      size_bytes: file?.size || null,
      uploaded_by: this.auth.user?.id
    });
    this.uploadingDocument = false;
    if (error) return alert('No se pudo registrar el documento.');
    this.documentDraft = { document_type: 'company_file', title: '', entity_type: 'company', storage_path: '' };
    this.selectedDocumentFile = null;
    await this.loadErpOperationalModules();
  }

  async openCompanyDocument(doc: any) {
    const bucket = doc?.storage_bucket || 'company-documents';
    const path = doc?.storage_path;
    if (!path) return alert('Este documento no tiene archivo adjunto.');

    const { data, error } = await this.supabase.client.storage
      .from(bucket)
      .createSignedUrl(path, 60);

    if (error || !data?.signedUrl) {
      return alert('No se pudo abrir el documento.');
    }

    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  }

  async updateCompanyDocumentStatus(doc: any, status: 'draft' | 'review' | 'approved' | 'archived') {
    const { error } = await this.supabase.client
      .from('company_documents')
      .update({ status })
      .eq('id', doc.id);
    if (error) return alert('No se pudo actualizar el documento.');
    doc.status = status;
    await this.loadErpOperationalModules();
  }

  async deleteCompanyDocument(doc: any) {
    if (!confirm(`Eliminar "${doc.title}"? Esta accion no se puede deshacer.`)) return;
    const bucket = doc?.storage_bucket || 'company-documents';
    const path = doc?.storage_path;

    if (path) {
      const { error: storageError } = await this.supabase.client.storage.from(bucket).remove([path]);
      if (storageError) {
        return alert('No se pudo borrar el archivo del storage.');
      }
    }

    const { error } = await this.supabase.client.from('company_documents').delete().eq('id', doc.id);
    if (error) return alert('No se pudo eliminar el documento.');
    await this.loadErpOperationalModules();
  }

  formatBytes(bytes: number | null | undefined) {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  async addComment() {
    if (!this.companyId || !this.commentDraft.body?.trim()) return;
    const { error } = await this.supabase.client.from('entity_comments').insert({
      company_id: this.companyId,
      entity_type: this.commentDraft.entity_type,
      entity_id: this.commentDraft.entity_id || null,
      body: this.commentDraft.body.trim(),
      visibility: this.commentDraft.visibility,
      created_by: this.auth.user?.id
    });
    if (error) return alert('No se pudo agregar el comentario.');
    this.commentDraft.body = '';
    await this.loadErpOperationalModules();
  }

  async createOnboardingProject() {
    if (!this.companyId) return;
    const { data, error } = await this.supabase.client
      .from('onboarding_projects')
      .insert({
        company_id: this.companyId,
        title: this.onboardingDraft.title || 'Activación de empresa',
        starts_at: this.onboardingDraft.starts_at || null,
        owner_id: this.auth.user?.id,
        created_by: this.auth.user?.id,
        status: 'active'
      })
      .select('id')
      .single();
    if (error) return alert('No se pudo crear el onboarding.');

    const defaultSteps = [
      { step_key: 'company_profile', title: 'Completar ficha empresa', sort_order: 1 },
      { step_key: 'upload_employees', title: 'Cargar colaboradores', sort_order: 2 },
      { step_key: 'benefits_setup', title: 'Configurar beneficios y SLA', sort_order: 3 },
      { step_key: 'send_invitations', title: 'Enviar invitaciones', sort_order: 4 }
    ];
    await this.supabase.client.from('onboarding_steps').insert(
      defaultSteps.map(step => ({ ...step, project_id: data.id }))
    );
    await this.loadErpOperationalModules();
  }

  async addOnboardingStep() {
    if (!this.onboardingStepDraft.project_id || !this.onboardingStepDraft.title?.trim()) return;
    const stepKey = this.onboardingStepDraft.step_key?.trim() || this.onboardingStepDraft.title.trim().toLowerCase().replace(/\s+/g, '_');
    const { error } = await this.supabase.client.from('onboarding_steps').insert({
      project_id: this.onboardingStepDraft.project_id,
      step_key: stepKey,
      title: this.onboardingStepDraft.title.trim(),
      description: this.onboardingStepDraft.description || null,
      sort_order: this.onboardingSteps.length + 1
    });
    if (error) return alert('No se pudo crear el paso.');
    this.onboardingStepDraft = { project_id: this.onboardingStepDraft.project_id, title: '', description: '', step_key: '' };
    await this.loadErpOperationalModules();
  }

  async toggleOnboardingStep(step: any) {
    const completed = !step.completed;
    const { error } = await this.supabase.client.from('onboarding_steps').update({
      completed,
      completed_by: completed ? this.auth.user?.id : null,
      completed_at: completed ? new Date().toISOString() : null
    }).eq('id', step.id);
    if (error) return alert('No se pudo actualizar el paso.');
    await this.loadErpOperationalModules();
  }

  async createInvitation() {
    if (!this.companyId || !this.invitationDraft.email?.trim()) return;
    const { error } = await this.supabase.client.from('company_invitations').insert({
      company_id: this.companyId,
      email: this.invitationDraft.email.trim().toLowerCase(),
      role: this.invitationDraft.role,
      invited_by: this.auth.user?.id
    });
    if (error) return alert('No se pudo crear la invitación.');
    this.invitationDraft = { email: '', role: 'employee' };
    await this.loadErpOperationalModules();
  }

  exportConfigSnapshotToCSV() {
    const rows = this.filteredConfigRows;
    if (!rows.length) return;
    const escapeCSV = (value: string) => `"${String(value || '').replace(/"/g, '""')}"`;
    const csv = ['Tipo,Nombre,Detalle', ...rows.map(row => [row.type, row.title, row.detail].map(escapeCSV).join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `configuracion_erp_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  }

  private normalizeHex(value: string | null | undefined, fallback: string) {
    if (!value || !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)) return fallback;
    if (value.length === 4) {
      return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
    }
    return value;
  }

  private hexToRgba(hex: string, alpha: number) {
    const normalized = this.normalizeHex(hex, '#123c4a').replace('#', '');
    const red = parseInt(normalized.slice(0, 2), 16);
    const green = parseInt(normalized.slice(2, 4), 16);
    const blue = parseInt(normalized.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  private mixHex(baseHex: string, blendHex: string, weight: number) {
    const base = this.normalizeHex(baseHex, '#f8fafc').replace('#', '');
    const blend = this.normalizeHex(blendHex, '#ffffff').replace('#', '');
    const mix = (start: number, end: number) => Math.round(start + (end - start) * weight);
    const channels = [0, 2, 4].map(index => {
      const value = mix(parseInt(base.slice(index, index + 2), 16), parseInt(blend.slice(index, index + 2), 16));
      return value.toString(16).padStart(2, '0');
    });
    return `#${channels.join('')}`;
  }

  private resolveThemeFont() {
    if (this.brandingDraft.erp_font_family === 'system') return 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    if (this.brandingDraft.erp_font_family === 'inter') return 'Inter, "DM Sans", sans-serif';
    return '"DM Sans", sans-serif';
  }

  setConfigSection(section: ConfigSection) {
    const companySections: ConfigSection[] = ['company', 'documents', 'messages', 'onboarding'];
    if (this.companyConfigMode && !companySections.includes(section)) {
      this.configSection = 'company';
      return;
    }
    if (section === 'workflow' && (this.hideWorkflowConfig || this.companyConfigMode)) {
      this.configSection = this.companyConfigMode ? 'company' : 'business';
      return;
    }
    this.configSection = section;
  }
}
