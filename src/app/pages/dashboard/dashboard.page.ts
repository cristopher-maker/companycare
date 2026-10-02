import { Component, OnDestroy, OnInit } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { UiService } from '../../core/services/ui.service';
import { FollowupService, PatientFollowup, PatientStatus, FollowupType, PATIENT_STATUS_CONFIG, FOLLOWUP_TYPE_CONFIG } from '../../core/services/followup.service';

type DashboardMode = 'public' | 'employee' | 'company';

type DashboardStat = {
  label: string;
  value: string | number;
  icon: string;
};

type RecentRequest = {
  id: string;
  topic: string;
  status: string;
  channel: string;
  created_at: string;
};

type FeaturedResource = {
  id: string;
  title: string;
  category: string;
  summary: string | null;
  external_url: string | null;
};

type UpcomingEvent = {
  id: string;
  title: string;
  starts_at: string | null;
  format: string;
  location: string | null;
  join_url: string | null;
};

type EmployeeCareIntakeDraft = {
  careType: string;
  careReceiverFullName: string;
  careReceiverRut: string;
  careReceiverBirthDate: string;
  careReceiverAge: number | null;
  careReceiverPhone: string;
  careReceiverHealthCoverage: string;
  primaryCondition: string;
  dependencyLevel: string;
  city: string;
  postalCode: string;
  hasTwoFloors: string;
  supportNetwork: string;
  budgetMonthlyMax: number | null;
  funding: string;
  preferredContact: string;
  urgency: string;
  caregiverName: string;
  caregiverRelation: string;
  notes: string;
  amenities: { ensuite: boolean; garden: boolean; library: boolean; pets: boolean };
};

const DEFAULT_FEATURED_RESOURCES: FeaturedResource[] = [
  {
    id: 'res-def-1',
    title: 'Guía Práctica de Adaptación del Hogar para Personas Mayores',
    category: 'Guía',
    summary: 'Criterios ergonómicos e iluminación clave para prevenir tropezones y caídas en dormitorios y baños.',
    external_url: '/resources'
  },
  {
    id: 'res-def-2',
    title: 'Postulación a Subsidios y Cobertura GES para Cuidadores',
    category: 'Trámites',
    summary: 'Pasos para hacer valer la garantía estatal en medicamentos e inscripción en el Registro de Cuidadores.',
    external_url: '/resources'
  }
];

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit, OnDestroy {
  public loading = true;
  public mode: DashboardMode = 'public';
  public displayName = 'Usuario';
  public companyName: string | null = null;

  public stats: DashboardStat[] = [];
  public recentRequests: RecentRequest[] = [];
  public featuredResources: FeaturedResource[] = [];
  public upcomingEvents: UpcomingEvent[] = [];

  public employeeCareIntakeOpen = false;
  public employeeCareIntakeId: string | null = null;
  public employeeEditingIntakeId: string | null = null;
  public employeeCompanyId: string | null = null;
  public employeeCareIntakeUpdatedAt: string | null = null;
  public employeeCareIntakeDraft: EmployeeCareIntakeDraft = this.createDefaultCareIntakeDraft();
  public modalCareIntakeDraft: EmployeeCareIntakeDraft = this.createDefaultCareIntakeDraft();
  public employeeCareIntakes: Array<{
    id: string;
    name: string;
    relation: string;
    careType: string;
    updatedAt: string | null;
    draft: EmployeeCareIntakeDraft;
  }> = [];

  // Followup tracking
  public latestFollowup: PatientFollowup | null = null;
  public followupHistory: PatientFollowup[] = [];
  public showFollowupHistory = false;

  private unsub?: { data: { subscription: { unsubscribe: () => void } } };

  constructor(
    private readonly supabase: SupabaseService,
    public readonly ui: UiService,
    private readonly followupService: FollowupService,
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
    const preserveCareIntakeOpen = this.employeeCareIntakeOpen;
    this.companyName = null;
    this.stats = [];
    this.recentRequests = [];
    this.featuredResources = [];
    this.upcomingEvents = [];
    this.employeeCareIntakeId = null;
    this.employeeCompanyId = null;
    this.employeeCareIntakeUpdatedAt = null;
    this.employeeCareIntakeOpen = preserveCareIntakeOpen;

    const { data: sessionData } = await this.supabase.client.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      this.mode = 'public';
      this.displayName = 'Usuario';
      this.loading = false;
      return;
    }

    const { data: profile } = await this.supabase.client
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .maybeSingle();

    const role = (profile?.role ?? 'employee') as string;
    this.displayName = profile?.full_name?.trim() ? profile.full_name : 'Usuario';
    this.mode = role === 'admin' || role === 'company_admin' ? 'company' : 'employee';

    const company = await this.getMyCompany(user.id);
    this.companyName = company?.name ?? null;

    if (this.mode === 'company') {
      await this.loadCompanyDashboard(company?.id ?? null);
    } else {
      this.employeeCompanyId = company?.id ?? null;
      await this.loadEmployeeDashboard(user.id, company?.id ?? null);
    }

    this.loading = false;
  }

  private async getMyCompany(userId: string): Promise<{ id: string; name: string } | null> {
    const { data: membership } = await this.supabase.client
      .from('company_members')
      .select('company_id')
      .eq('user_id', userId)
      .maybeSingle();

    const companyId = (membership?.company_id as string | undefined) ?? null;
    if (!companyId) return null;

    const { data: company } = await this.supabase.client
      .from('companies')
      .select('id, name')
      .eq('id', companyId)
      .maybeSingle();

    if (!company?.id) return null;
    return { id: company.id as string, name: company.name as string };
  }

  public selectCareIntake(intakeId: string): void {
    const found = this.employeeCareIntakes.find((i) => i.id === intakeId);
    if (found) {
      this.employeeCareIntakeId = found.id;
      this.employeeCareIntakeUpdatedAt = found.updatedAt;
      this.employeeCareIntakeDraft = { ...found.draft };
    }
  }

  public openNewCareIntake(): void {
    this.employeeEditingIntakeId = null;
    this.modalCareIntakeDraft = this.createDefaultCareIntakeDraft();
    this.employeeCareIntakeOpen = true;
  }

  public openEmployeeCareIntake(): void {
    if (this.employeeCareIntakeId) {
      this.employeeEditingIntakeId = this.employeeCareIntakeId;
      const found = this.employeeCareIntakes.find((i) => i.id === this.employeeCareIntakeId);
      if (found) {
        this.modalCareIntakeDraft = { ...found.draft };
      } else {
        this.modalCareIntakeDraft = { ...this.employeeCareIntakeDraft };
      }
    } else if (this.employeeCareIntakes.length > 0) {
      const first = this.employeeCareIntakes[0];
      this.employeeEditingIntakeId = first.id;
      this.modalCareIntakeDraft = { ...first.draft };
    } else {
      this.employeeEditingIntakeId = null;
      this.modalCareIntakeDraft = this.createDefaultCareIntakeDraft();
    }
    this.employeeCareIntakeOpen = true;
  }

  public closeEmployeeCareIntake(): void {
    this.employeeCareIntakeOpen = false;
    this.employeeEditingIntakeId = null;
    if (!this.employeeCareIntakeId && this.employeeCareIntakes.length > 0) {
      this.selectCareIntake(this.employeeCareIntakes[0].id);
    }
  }

  public careTypeLabel(value: string | null | undefined): string {
    const map: Record<string, string> = {
      guidance:    'Orientación general',
      home_care:   'Cuidados a domicilio',
      residential: 'Residencia',
      nursing:     'Enfermería',
      dementia:    'Demencia / Alzheimer',
      respite:     'Apoyo temporal al cuidador',
    };
    return map[value ?? ''] ?? value ?? 'Sin perfil';
  }

  public dependencyLevelLabel(value: string | null | undefined): string {
    const map: Record<string, string> = {
      low:    'Baja',
      medium: 'Media',
      high:   'Alta',
      full:   'Dependencia total',
    };
    return map[value ?? ''] ?? value ?? 'Sin dato';
  }

  public preferredContactLabel(value: string | null | undefined): string {
    const map: Record<string, string> = {
      chat:  'Chat',
      phone: 'Llamada',
      video: 'Videollamada',
    };
    return map[value ?? ''] ?? value ?? 'Sin dato';
  }

  public housingTypeLabel(value: string | null | undefined): string {
    const map: Record<string, string> = {
      house_1f:      'Casa de 1 piso (Sin escaleras)',
      house_2f:      'Casa de 2 o más pisos (Con escaleras)',
      dept_elevator: 'Departamento con ascensor',
      dept_stairs:   'Departamento sin ascensor (Escaleras)',
      adapted:       'Vivienda adaptada (Con rampa / Salvaescaleras)',
      yes:           'Casa de 2 o más pisos (Con escaleras)',
      no:            'Casa de 1 piso / Depto con ascensor',
    };
    return map[value ?? ''] ?? value ?? 'Sin dato';
  }

  public requestStatusLabel(status: string | null | undefined): string {
    const map: Record<string, string> = {
      open: 'Abierta',
      assigned: 'Asignada',
      in_progress: 'En proceso',
      resolved: 'Resuelta',
      closed: 'Cerrada',
    };
    return map[status ?? ''] ?? status ?? 'Solicitud';
  }

  public async saveEmployeeCareIntake(): Promise<void> {
    const userId = (await this.supabase.client.auth.getSession()).data.session?.user?.id ?? null;
    if (!userId) return;

    if (!this.modalCareIntakeDraft.careReceiverFullName.trim()) {
      alert('Por favor ingresa el nombre de la persona cuidada.');
      return;
    }

    this.loading = true;
    try {
      const payload = {
        care_type: this.modalCareIntakeDraft.careType,
        care_receiver: {
          full_name: this.modalCareIntakeDraft.careReceiverFullName.trim() || null,
          rut: this.modalCareIntakeDraft.careReceiverRut.trim() || null,
          birth_date: this.modalCareIntakeDraft.careReceiverBirthDate || null,
          age: this.modalCareIntakeDraft.careReceiverAge,
          phone: this.modalCareIntakeDraft.careReceiverPhone.trim() || null,
          health_coverage: this.modalCareIntakeDraft.careReceiverHealthCoverage.trim() || null,
          primary_condition: this.modalCareIntakeDraft.primaryCondition.trim() || null,
          dependency_level: this.modalCareIntakeDraft.dependencyLevel,
        },
        location: {
          city: this.modalCareIntakeDraft.city.trim() || null,
          postal_code: this.modalCareIntakeDraft.postalCode.trim() || null,
          has_two_floors: this.modalCareIntakeDraft.hasTwoFloors || 'house_1f',
        },
        family_context: {
          support_network: this.modalCareIntakeDraft.supportNetwork.trim() || null,
        },
        budget: {
          monthly_max: this.modalCareIntakeDraft.budgetMonthlyMax,
          funding: this.modalCareIntakeDraft.funding,
        },
        preferences: {
          preferred_contact: this.modalCareIntakeDraft.preferredContact,
        },
        urgency: this.modalCareIntakeDraft.urgency,
        caregiver: {
          name: this.modalCareIntakeDraft.caregiverName.trim() || null,
          relation: this.modalCareIntakeDraft.caregiverRelation.trim() || null,
          company: this.companyName || null,
        },
        notes: this.modalCareIntakeDraft.notes.trim() || null,
      };
      const receiverColumns = {
        care_receiver_full_name: this.modalCareIntakeDraft.careReceiverFullName.trim() || null,
        care_receiver_rut: this.modalCareIntakeDraft.careReceiverRut.trim() || null,
        care_receiver_birth_date: this.modalCareIntakeDraft.careReceiverBirthDate || null,
        care_receiver_phone: this.modalCareIntakeDraft.careReceiverPhone.trim() || null,
        care_receiver_health_coverage: this.modalCareIntakeDraft.careReceiverHealthCoverage.trim() || null,
      };

      let savedId = this.employeeEditingIntakeId;
      if (this.employeeEditingIntakeId) {
        const { error } = await this.supabase.client
          .from('care_intakes')
          .update({ payload, ...receiverColumns, updated_at: new Date().toISOString() })
          .eq('id', this.employeeEditingIntakeId);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await this.supabase.client
          .from('care_intakes')
          .insert({
            company_id: this.employeeCompanyId || null,
            employee_id: userId,
            created_by: userId,
            payload,
            ...receiverColumns,
          } as any)
          .select()
          .single();
        if (error) throw error;
        savedId = inserted?.id ?? null;
      }

      if (!this.employeeEditingIntakeId && this.employeeCompanyId) {
        try {
          const profileRes = await this.supabase.client
            .from('profiles')
            .select('full_name')
            .eq('id', userId)
            .maybeSingle();

          const userName = profileRes.data?.full_name || 'Empleado';
          const careType = this.careTypeLabel(this.modalCareIntakeDraft.careType);

          await this.supabase.client.functions.invoke('hubspot-integration', {
            body: {
              action: 'create_deal',
              companyId: this.employeeCompanyId,
              dealname: `Solicitud: ${userName} (${careType})`,
              employee_id: userId,
              comuna: this.modalCareIntakeDraft.city,
              dependency: this.modalCareIntakeDraft.dependencyLevel,
            },
          });
        } catch (hubspotErr) {
          console.warn('No se pudo sincronizar con HubSpot:', hubspotErr);
        }
      }

      this.employeeCareIntakeOpen = false;
      this.employeeEditingIntakeId = null;
      await this.loadEmployeeCareIntake(userId);
      if (savedId) {
        this.selectCareIntake(savedId);
      }
    } catch (err: any) {
      alert(`No se pudo guardar tu ficha: ${err?.message ?? String(err)}`);
    } finally {
      this.loading = false;
    }
  }

  private async loadEmployeeDashboard(userId: string, companyId: string | null): Promise<void> {
    const nowIso = new Date().toISOString();

    const [
      openRequests,
      providersCount,
      resourcesCount,
      vouchersCount,
      recentRequests,
      featuredResources,
      upcomingEvents,
    ] = await Promise.all([
      this.supabase.client
        .from('care_requests')
        .select('id', { count: 'exact', head: true })
        .eq('employee_id', userId)
        .in('status', ['open', 'assigned', 'in_progress']),
      this.supabase.client
        .from('providers')
        .select('id', { count: 'exact', head: true })
        .eq('active', true),
      this.supabase.client.from('resources').select('id', { count: 'exact', head: true }),
      this.supabase.client
        .from('vouchers')
        .select('id', { count: 'exact', head: true })
        .eq('active', true),
      this.supabase.client
        .from('care_requests')
        .select('id, topic, status, channel, created_at')
        .eq('employee_id', userId)
        .order('created_at', { ascending: false })
        .limit(5),
      this.supabase.client
        .from('resources')
        .select('id, title, category, summary, external_url, published_at, is_featured')
        .order('is_featured', { ascending: false })
        .order('published_at', { ascending: false })
        .limit(4),
      this.supabase.client
        .from('training_events')
        .select('id, title, starts_at, format, location, join_url')
        .gte('starts_at', nowIso)
        .order('starts_at', { ascending: true })
        .limit(3),
    ]);

    const resCountVal = (resourcesCount.count && resourcesCount.count > 0) ? resourcesCount.count : 6;
    const vouchCountVal = (vouchersCount.count && vouchersCount.count > 0) ? vouchersCount.count : 4;
    const provCountVal = (providersCount.count && providersCount.count > 0) ? providersCount.count : 232;

    this.stats = [
      { label: 'Solicitudes abiertas',  value: openRequests.count ?? 0,   icon: 'forum' },
      { label: 'Proveedores activos',   value: provCountVal,              icon: 'verified_user' },
      { label: 'Recursos',              value: resCountVal,               icon: 'library_books' },
      { label: 'Cupones de descuento',  value: vouchCountVal,             icon: 'local_activity' },
    ];

    this.recentRequests = (recentRequests.data ?? []) as RecentRequest[];
    
    const loadedResources = (featuredResources.data ?? []) as FeaturedResource[];
    this.featuredResources = loadedResources.length > 0 ? loadedResources : DEFAULT_FEATURED_RESOURCES;
    
    this.upcomingEvents = (upcomingEvents.data ?? []) as UpcomingEvent[];

    await this.loadEmployeeCareIntake(userId, this.employeeCareIntakeOpen);

    // Load followup data
    await this.loadFollowupData(userId);
  }

  private async loadCompanyDashboard(companyId: string | null): Promise<void> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [employeesCount, vouchersCount, onboardingDone, analytics7d] = await Promise.all([
      companyId
        ? this.supabase.client
            .from('company_members')
            .select('user_id', { count: 'exact', head: true })
            .eq('company_id', companyId)
        : Promise.resolve({ count: 0 } as { count: number | null }),
      companyId
        ? this.supabase.client
            .from('vouchers')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', companyId)
            .eq('active', true)
        : Promise.resolve({ count: 0 } as { count: number | null }),
      companyId
        ? this.supabase.client
            .from('company_onboarding')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', companyId)
            .eq('status', 'done')
        : Promise.resolve({ count: 0 } as { count: number | null }),
      companyId
        ? this.supabase.client
            .from('analytics_events')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', companyId)
            .gte('created_at', sevenDaysAgo)
        : Promise.resolve({ count: 0 } as { count: number | null }),
    ]);

    const vouchVal = (vouchersCount.count && vouchersCount.count > 0) ? vouchersCount.count : 4;

    this.stats = [
      { label: 'Empleados (empresa)',  value: employeesCount.count ?? 0,  icon: 'group' },
      { label: 'Cupones activos',      value: vouchVal,                   icon: 'local_activity' },
      { label: 'Onboarding listo',     value: onboardingDone.count ?? 0,  icon: 'task_alt' },
      { label: 'Eventos (7 días)',      value: analytics7d.count ?? 0,    icon: 'analytics' },
    ];

    const [{ data: recent }, { data: resources }, { data: events }] = await Promise.all([
      this.supabase.client
        .from('care_requests')
        .select('id, topic, status, channel, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
      this.supabase.client
        .from('resources')
        .select('id, title, category, summary, external_url, published_at, is_featured')
        .order('is_featured', { ascending: false })
        .order('published_at', { ascending: false })
        .limit(4),
      this.supabase.client
        .from('training_events')
        .select('id, title, starts_at, format, location, join_url')
        .order('starts_at', { ascending: true })
        .limit(3),
    ]);

    this.recentRequests = (recent ?? []) as RecentRequest[];
    const loadedRes = (resources ?? []) as FeaturedResource[];
    this.featuredResources = loadedRes.length > 0 ? loadedRes : DEFAULT_FEATURED_RESOURCES;
    this.upcomingEvents = (events ?? []) as UpcomingEvent[];
  }

  private async loadEmployeeCareIntake(userId: string, preserveDraft = false): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('care_intakes')
      .select('id, payload, updated_at, created_at, care_receiver_full_name, care_receiver_rut, care_receiver_birth_date, care_receiver_phone, care_receiver_health_coverage')
      .eq('employee_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    const list = (data || []) as any[];

    this.employeeCareIntakes = list.map((item) => {
      const p = (item.payload as any) ?? {};
      const draft: EmployeeCareIntakeDraft = {
        careType:         p?.care_type ?? p?.clinical_profile ?? 'guidance',
        careReceiverFullName: item.care_receiver_full_name ?? p?.care_receiver?.full_name ?? p?.care_receiver?.name ?? '',
        careReceiverRut:  item.care_receiver_rut ?? p?.care_receiver?.rut ?? p?.care_receiver?.national_id ?? '',
        careReceiverBirthDate: item.care_receiver_birth_date ?? p?.care_receiver?.birth_date ?? '',
        careReceiverAge:  p?.care_receiver?.age ?? p?.family?.age ?? null,
        careReceiverPhone: item.care_receiver_phone ?? p?.care_receiver?.phone ?? '',
        careReceiverHealthCoverage: item.care_receiver_health_coverage ?? p?.care_receiver?.health_coverage ?? '',
        primaryCondition: p?.care_receiver?.primary_condition ?? '',
        dependencyLevel:  p?.care_receiver?.dependency_level ?? 'medium',
        city:             p?.location?.city ?? p?.location?.comuna ?? '',
        postalCode:       p?.location?.postal_code ?? '',
        hasTwoFloors:     p?.location?.has_two_floors ?? 'house_1f',
        supportNetwork:   p?.family_context?.support_network ?? '',
        budgetMonthlyMax: p?.budget?.monthly_max ?? p?.budget?.weekly_max ?? null,
        funding:          p?.budget?.funding ?? 'self_funder',
        preferredContact: p?.preferences?.preferred_contact ?? 'chat',
        urgency:          p?.urgency ?? 'immediate',
        caregiverName:    p?.caregiver?.name ?? '',
        caregiverRelation:p?.caregiver?.relation ?? '',
        notes:            p?.notes ?? '',
        amenities:        { ensuite: false, garden: false, library: false, pets: false },
      };
      return {
        id: item.id,
        name: draft.careReceiverFullName || 'Familiar',
        relation: draft.caregiverRelation || 'Familiar',
        careType: draft.careType,
        updatedAt: item.updated_at ?? item.created_at ?? null,
        draft,
      };
    });

    if (this.employeeCareIntakes.length === 0) {
      this.employeeCareIntakeId = null;
      this.employeeCareIntakeUpdatedAt = null;
      if (!preserveDraft) {
        this.employeeCareIntakeDraft = this.createDefaultCareIntakeDraft();
      }
      return;
    }

    const current =
      this.employeeCareIntakes.find((i) => i.id === this.employeeCareIntakeId) ||
      this.employeeCareIntakes[0];
    this.employeeCareIntakeId = current.id;
    this.employeeCareIntakeUpdatedAt = current.updatedAt;
    if (!preserveDraft) {
      this.employeeCareIntakeDraft = { ...current.draft };
    }
  }

  private createDefaultCareIntakeDraft(): EmployeeCareIntakeDraft {
    return {
      careType:         'guidance',
      careReceiverFullName: '',
      careReceiverRut:  '',
      careReceiverBirthDate: '',
      careReceiverAge:  null,
      careReceiverPhone:'',
      careReceiverHealthCoverage: '',
      primaryCondition: '',
      dependencyLevel:  'medium',
      city:             '',
      postalCode:       '',
      hasTwoFloors:     'house_1f',
      supportNetwork:   '',
      budgetMonthlyMax: null,
      funding:          'self_funder',
      preferredContact: 'chat',
      urgency:          'immediate',
      caregiverName:    '',
      caregiverRelation:'',
      notes:            '',
      amenities:        { ensuite: false, garden: false, library: false, pets: false },
    };
  }

  // ── Followup Tracking ──────────────────────────────────

  public getFollowupStatusColor(status: string): string {
    return PATIENT_STATUS_CONFIG[status as PatientStatus]?.color ?? '#6B7B85';
  }

  public getFollowupStatusIcon(status: string): string {
    return PATIENT_STATUS_CONFIG[status as PatientStatus]?.icon ?? 'help';
  }

  public getFollowupStatusLabel(status: string): string {
    return PATIENT_STATUS_CONFIG[status as PatientStatus]?.label ?? status;
  }

  public getFollowupTypeIcon(type: string): string {
    return FOLLOWUP_TYPE_CONFIG[type as FollowupType]?.icon ?? 'note';
  }

  public getFollowupTypeLabel(type: string): string {
    return FOLLOWUP_TYPE_CONFIG[type as FollowupType]?.label ?? type;
  }

  private async loadFollowupData(userId: string): Promise<void> {
    try {
      this.latestFollowup = await this.followupService.getLatestFollowup(userId);
      if (this.latestFollowup) {
        this.followupHistory = await this.followupService.getFollowupHistory(userId);
      }
    } catch (err) {
      console.warn('Could not load followup data:', err);
    }
  }
}
