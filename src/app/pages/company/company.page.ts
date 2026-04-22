﻿import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import {
  CompanyPlan,
  CompanyPlanCapabilities,
  CompanyPlanService,
} from '../../core/services/company-plan.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { environment } from '../../../environments/environment';

type CompanyTab = 'Miembros' | 'Branding' | 'Vouchers' | 'Onboarding' | 'Metricas';

type CompanyRow = {
  id: string;
  name: string;
  domain: string | null;
  tax_id: string | null;
  plan_tier: CompanyPlan;
};

type BrandingRow = {
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
};

type MemberRole = 'employee' | 'hr_admin' | 'manager';

type MemberRow = {
  user_id: string;
  member_role: MemberRole;
  full_name: string | null;
  email: string | null;
  created_at: string | null;
};

type VoucherRow = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  active: boolean;
};

type OnboardingStatus = 'pending' | 'done' | 'skipped';

type OnboardingRow = {
  id: string;
  step_key: string;
  status: OnboardingStatus;
};

type CareIntakeRow = {
  id: string;
  employee_id: string | null;
  payload: any;
  created_at: string;
};

type MetricsRange = '7d' | '30d' | '90d';

@Component({
  selector: 'app-company',
  templateUrl: './company.page.html',
  styleUrls: ['./company.page.scss'],
})
export class CompanyPage {
  public tab: CompanyTab = 'Metricas';

  public loading = true;
  public saving = false;
  public isCompanyAdmin = false;

  public companyId: string | null = null;
  public company: CompanyRow | null = null;
  public companyPlan: CompanyPlan = 'lite';
  public capabilities: CompanyPlanCapabilities;

  public linkDraft: { name: string; taxId: string; domain: string } = { name: '', taxId: '', domain: '' };

  public members: MemberRow[] = [];
  public memberEmail = '';
  public memberRole: MemberRole = 'employee';

  public branding: BrandingRow = {
    logo_url: null,
    primary_color: '#1b4dff',
    secondary_color: '#6366f1',
  };

  public vouchers: VoucherRow[] = [];
  public voucherDraft: { code: string; title: string; description: string; active: boolean } = {
    code: '',
    title: '',
    description: '',
    active: true,
  };

  public onboarding: OnboardingRow[] = [];

  public careIntakes: CareIntakeRow[] = [];
  public careIntakeSearch = '';
  public selectedIntake: CareIntakeRow | null = null;

  public careIntakeDraft: {
    employeeId: string;
    clinicalProfile: string;
    postalCode: string;
    radiusKm: number | null;
    budgetWeeklyMax: number | null;
    funding: string;
    amenities: { ensuite: boolean; garden: boolean; library: boolean; pets: boolean };
    ambiance: string;
    dietary: string;
    urgency: string;
    caregiverName: string;
    caregiverRelation: string;
    caregiverCompany: string;
  } = {
    employeeId: '',
    clinicalProfile: 'residential',
    postalCode: '',
    radiusKm: 10,
    budgetWeeklyMax: null,
    funding: 'self_funder',
    amenities: { ensuite: false, garden: false, library: false, pets: false },
    ambiance: 'small',
    dietary: '',
    urgency: 'immediate',
    caregiverName: '',
    caregiverRelation: '',
    caregiverCompany: '',
  };

  public metrics: {
    employees: number;
    vouchersActive: number;
    vouchersExpiring: number;
    onboardingDone: number;
    analytics30d: number;
    activeUsers: number;
    enquiries: number;
  } = {
    employees: 0,
    vouchersActive: 0,
    vouchersExpiring: 0,
    onboardingDone: 0,
    analytics30d: 0,
    activeUsers: 0,
    enquiries: 0,
  };

  public hubspotPipeline: { id: string; label: string } | null = null;
  public hubspotLeadStatusMetrics: Record<
    'nuevo' | 'contactado' | 'evaluacion' | 'match' | 'cerrado' | 'perdido',
    number
  > = {
    nuevo: 0,
    contactado: 0,
    evaluacion: 0,
    match: 0,
    cerrado: 0,
    perdido: 0,
  };
  public hubspotLoading = false;
  public hubspotError = '';

  public metricsRange: MetricsRange = '30d';
  public monthlyActivity: Array<{ label: string; value: number }> = [];
  public trafficSummary: number[] = [];
  public occupancyTrend: number[] = [];
  public revenueTrend: number[] = [];
  public recentEnquiries: Array<{ id: string; property: string; employee: string; date: string }> = [];

  constructor(
    private readonly auth: AuthService,
    private readonly supabase: SupabaseService,
    private readonly companyPlanService: CompanyPlanService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {
    this.capabilities = this.companyPlanService.getCapabilities('lite');
  }

  public async ionViewWillEnter(): Promise<void> {
    await this.refresh();
    this.applyTabFromQuery();
  }

  private applyTabFromQuery(): void {
    const raw = (this.route.snapshot.queryParamMap.get('tab') || '').trim().toLowerCase();
    if (!raw) return;

    const mapped: CompanyTab | null =
      raw === 'miembros' || raw === 'members'
        ? 'Miembros'
        : raw === 'branding' || raw === 'profile' || raw === 'settings'
        ? 'Branding'
        : raw === 'vouchers'
        ? 'Vouchers'
        : raw === 'onboarding' || raw === 'tasks'
        ? 'Onboarding'
        : raw === 'metricas' || raw === 'metrics' || raw === 'reporting'
        ? 'Metricas'
        : null;

    if (!mapped || !this.isTabVisible(mapped)) return;
    this.tab = mapped;
  }

  public async refresh(): Promise<void> {
    this.loading = true;
    try {
      await this.loadRoleAndCompany();

      if (!this.isCompanyAdmin) {
        await this.router.navigateByUrl('/home');
        return;
      }
      if (!this.companyId) return;

      await Promise.all([
        this.loadCompany(),
        this.loadMembers(),
        this.loadBranding(),
        this.loadVouchers(),
        this.loadOnboarding(),
        this.loadCareIntakes(),
        this.loadMetrics(),
      ]);

      await this.loadHubspotMetrics();
      await this.loadMonitoringData();
    } catch (err: any) {
      console.error(err);
      alert(`Error: ${err?.message ?? String(err)}`);
    } finally {
      this.loading = false;
    }
  }

  private async loadRoleAndCompany(): Promise<void> {
    const userId = this.auth.user?.id ?? null;
    if (!userId) {
      this.isCompanyAdmin = false;
      this.companyId = null;
      return;
    }

    const [{ data: profile, error: profileError }, { data: membership, error: memberError }] = await Promise.all([
      this.supabase.client.from('profiles').select('role').eq('id', userId).maybeSingle(),
      this.supabase.client.from('company_members').select('company_id').eq('user_id', userId).maybeSingle(),
    ]);

    if (profileError) throw profileError;
    if (memberError) throw memberError;

    const role = (profile?.role as string | undefined) ?? 'employee';
    this.isCompanyAdmin = role === 'admin' || role === 'company_admin';
    this.companyId = (membership?.company_id as string | undefined) ?? null;

    if (!this.companyId) {
      const email = this.auth.user?.email ?? '';
      const domain = email.includes('@') ? email.split('@')[1]!.toLowerCase() : '';
      this.linkDraft.domain = this.linkDraft.domain || domain;
    }
  }

  public async createAndLinkCompany(): Promise<void> {
    const userId = this.auth.user?.id ?? null;
    if (!userId) return;

    const name = this.linkDraft.name.trim();
    const taxId = this.linkDraft.taxId.trim();
    const domain = this.linkDraft.domain.trim() || null;

    if (!name) {
      alert('Ingresa el nombre de la empresa.');
      return;
    }
    if (!taxId) {
      alert('Ingresa el RUT de la empresa.');
      return;
    }

    this.saving = true;
    try {
      // Create company (or find by tax_id).
      let companyId: string | null = null;

      const insertRes = await this.supabase.client
        .from('companies')
        .insert({ name, tax_id: taxId, domain, plan_tier: this.companyPlan })
        .select('id')
        .maybeSingle();

      if (insertRes.data?.id) {
        companyId = insertRes.data.id as string;
      } else {
        const { data: existing, error: findError } = await this.supabase.client
          .from('companies')
          .select('id')
          .eq('tax_id', taxId)
          .maybeSingle();
        if (findError) throw findError;
        companyId = (existing?.id as string | undefined) ?? null;
      }

      if (!companyId) {
        if (insertRes.error) throw insertRes.error;
        throw new Error('No se pudo crear/vincular la empresa.');
      }

      const { error: memberError } = await this.supabase.client.from('company_members').upsert(
        {
          company_id: companyId,
          user_id: userId,
          member_role: 'hr_admin',
        } as any,
        { onConflict: 'company_id,user_id' }
      );
      if (memberError) throw memberError;

      this.companyId = companyId;
      await this.refresh();
    } catch (err: any) {
      console.error(err);
      alert(`No se pudo vincular la empresa: ${err?.message ?? String(err)}`);
    } finally {
      this.saving = false;
    }
  }

  private async loadCompany(): Promise<void> {
    if (!this.companyId) return;
    const { data, error } = await this.supabase.client
      .from('companies')
      .select('id,name,domain,tax_id,plan_tier')
      .eq('id', this.companyId)
      .maybeSingle();
    if (error) throw error;
    this.company = (data ?? null) as CompanyRow | null;
    this.companyPlan = this.companyPlanService.normalizePlan(this.company?.plan_tier ?? 'lite');
    this.capabilities = this.companyPlanService.getCapabilities(this.companyPlan);
    this.ensureAllowedTab();
    if (this.company?.name && !this.careIntakeDraft.caregiverCompany) {
      this.careIntakeDraft.caregiverCompany = this.company.name;
    }
  }

  public async saveCompanyPlan(): Promise<void> {
    if (!this.companyId) return;
    this.saving = true;
    try {
      const { error } = await this.supabase.client
        .from('companies')
        .update({ plan_tier: this.companyPlan } as any)
        .eq('id', this.companyId);
      if (error) throw error;

      this.capabilities = this.companyPlanService.getCapabilities(this.companyPlan);
      this.ensureAllowedTab();
      await this.loadCompany();
      await this.loadMetrics();
    } catch (err: any) {
      console.error(err);
      alert(`No se pudo actualizar el plan: ${err?.message ?? String(err)}`);
    } finally {
      this.saving = false;
    }
  }

  public isTabVisible(tab: CompanyTab): boolean {
    if (tab === 'Vouchers') return this.capabilities.vouchers;
    if (tab === 'Metricas') return this.capabilities.metrics;
    return true;
  }

  public get enabledPlanFeatures(): string[] {
    return this.companyPlanService.getFeatureLabels(this.companyPlan);
  }

  public get companyPlanLabel(): string {
    switch (this.companyPlan) {
      case 'empresa':
        return 'Empresa';
      case 'premium':
        return 'Premium';
      default:
        return 'Lite';
    }
  }

  public get onboardingTotalSteps(): number {
    return this.defaultStepKeys.length;
  }

  public get onboardingPendingCount(): number {
    return Math.max(this.onboardingTotalSteps - this.metrics.onboardingDone, 0);
  }

  public get onboardingReadyLabel(): string {
    if (this.onboardingPercent >= 100) return 'Listo para lanzamiento';
    if (this.onboardingPercent >= 50) return 'Implementación en progreso';
    return 'Configuración inicial pendiente';
  }

  public get onboardingProgressCopy(): string {
    if (this.onboardingPercent >= 100) {
      return 'El beneficio ya quedó configurado y puede comunicarse internamente.';
    }
    return `Faltan ${this.onboardingPendingCount} paso(s) para dejar el beneficio listo para lanzamiento.`;
  }

  public get companyInitials(): string {
    const source = this.company?.name?.trim() || 'Company Care';
    return source
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  public get latestMembers(): MemberRow[] {
    return [...this.members]
      .sort(
        (left, right) =>
          new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime()
      )
      .slice(0, 5);
  }

  public get meaningfulMetricCards(): Array<{ label: string; value: number; detail: string }> {
    return [
      { label: 'Empleados', value: this.metrics.employees, detail: 'Miembros activos' },
      { label: 'Vouchers activos', value: this.metrics.vouchersActive, detail: 'Beneficios vigentes' },
      { label: 'Solicitudes', value: this.metrics.enquiries, detail: 'Casos dentro del rango' },
      { label: 'Usuarios activos', value: this.metrics.activeUsers, detail: 'Con actividad en el rango' },
      { label: 'Eventos web', value: this.metrics.analytics30d, detail: 'Actividad registrada' },
    ].filter((item) => item.value > 0);
  }

  public get emptyMetricCards(): Array<{ label: string; value: number }> {
    return [
      { label: 'Vouchers activos', value: this.metrics.vouchersActive },
      { label: 'Solicitudes', value: this.metrics.enquiries },
      { label: 'Usuarios activos', value: this.metrics.activeUsers },
      { label: 'Eventos web', value: this.metrics.analytics30d },
    ].filter((item) => item.value === 0);
  }

  public get hasTrafficData(): boolean {
    return this.trafficSummary.some((point) => point > 0);
  }

  public get hasMonthlyActivityData(): boolean {
    return this.monthlyActivity.some((item) => item.value > 0);
  }

  private ensureAllowedTab(): void {
    if (this.isTabVisible(this.tab)) return;
    this.tab = 'Miembros';
  }

  private async loadMembers(): Promise<void> {
    if (!this.companyId) return;
    const { data, error } = await this.supabase.client
      .from('company_members')
      .select('user_id, member_role, created_at, profiles:profiles(full_name,email)')
      .eq('company_id', this.companyId)
      .order('created_at', { ascending: true });
    if (error) throw error;

    this.members = (data ?? []).map((row: any) => ({
      user_id: row.user_id as string,
      member_role: row.member_role as MemberRole,
      full_name: row.profiles?.full_name ?? null,
      email: row.profiles?.email ?? null,
      created_at: (row.created_at as string | null) ?? null,
    }));
  }

  private async loadCareIntakes(): Promise<void> {
    if (!this.companyId) return;
    const { data, error } = await this.supabase.client
      .from('care_intakes')
      .select('id, employee_id, payload, created_at')
      .eq('company_id', this.companyId)
      .order('created_at', { ascending: false })
      .limit(6);
    if (error) throw error;
    this.careIntakes = (data ?? []) as CareIntakeRow[];
  }

  public async createCareIntake(): Promise<void> {
    if (!this.companyId) {
      alert('Primero vincula una empresa.');
      return;
    }
    const employeeId = this.careIntakeDraft.employeeId;
    if (!employeeId) {
      alert('Selecciona un empleado.');
      return;
    }
    if (!this.careIntakeDraft.postalCode.trim()) {
      alert('Ingresa un código postal.');
      return;
    }

    this.saving = true;
    try {
      const payload = {
        clinical_profile: this.careIntakeDraft.clinicalProfile,
        location: {
          postal_code: this.careIntakeDraft.postalCode.trim(),
          radius_km: this.careIntakeDraft.radiusKm,
        },
        budget: {
          weekly_max: this.careIntakeDraft.budgetWeeklyMax,
          funding: this.careIntakeDraft.funding,
        },
        lifestyle: {
          amenities: { ...this.careIntakeDraft.amenities },
          ambiance: this.careIntakeDraft.ambiance,
          dietary: this.careIntakeDraft.dietary.trim() || null,
        },
        urgency: this.careIntakeDraft.urgency,
        caregiver: {
          name: this.careIntakeDraft.caregiverName.trim() || null,
          relation: this.careIntakeDraft.caregiverRelation.trim() || null,
          company: this.careIntakeDraft.caregiverCompany.trim() || null,
        },
      };

      const { error } = await this.supabase.client.from('care_intakes').insert({
        company_id: this.companyId,
        employee_id: employeeId,
        created_by: this.auth.user?.id ?? null,
        payload,
      } as any);
      if (error) throw error;

      // Sincronizar nuevo caso con HubSpot
      try {
        const profileRes = await this.supabase.client
          .from('profiles')
          .select('full_name')
          .eq('id', employeeId)
          .maybeSingle();

        const userName = profileRes.data?.full_name || 'Empleado';

        await this.supabase.client.functions.invoke('hubspot-integration', {
          body: {
            action: 'create_deal',
            companyId: this.companyId,
            dealname: `Solicitud de HR para: ${userName} (${this.clinicalProfileLabel(this.careIntakeDraft.clinicalProfile)})`,
            employee_id: employeeId,
            comuna: this.careIntakeDraft.postalCode,
            care_profile: this.careIntakeDraft.clinicalProfile,
            amount: this.careIntakeDraft.budgetWeeklyMax,
          },
        });
      } catch (hubspotErr) {
        console.warn('No se pudo sincronizar el caso con HubSpot:', hubspotErr);
      }

      this.careIntakeDraft = {
        ...this.careIntakeDraft,
        employeeId: '',
        clinicalProfile: 'residential',
        postalCode: '',
        radiusKm: 10,
        budgetWeeklyMax: null,
        funding: 'self_funder',
        amenities: { ensuite: false, garden: false, library: false, pets: false },
        ambiance: 'small',
        dietary: '',
        urgency: 'immediate',
        caregiverName: '',
        caregiverRelation: '',
      };
      await this.loadCareIntakes();
    } catch (err: any) {
      console.error(err);
      alert(`No se pudo guardar la ficha: ${err?.message ?? String(err)}`);
    } finally {
      this.saving = false;
    }
  }

  public memberLabel(userId: string | null): string {
    if (!userId) return 'Sin empleado';
    const m = this.members.find((x) => x.user_id === userId);
    if (!m) return userId;
    return m.full_name?.trim() ? m.full_name : m.email || userId;
  }

  public clinicalProfileLabel(value: string | null | undefined): string {
    switch (value) {
      case 'residential':
        return 'Cuidado residencial';
      case 'nursing':
        return 'Cuidado de enfermería';
      case 'dementia':
        return 'Demencia / Alzheimer';
      case 'respite':
        return 'Cuidado de respiro';
      default:
        return value || 'Sin perfil';
    }
  }

  public fundingLabel(value: string | null | undefined): string {
    switch (value) {
      case 'self_funder':
        return 'Pago privado';
      case 'local_authority':
        return 'Ayuda pública';
      default:
        return value || 'Sin dato';
    }
  }

  public urgencyLabel(value: string | null | undefined): string {
    switch (value) {
      case 'immediate':
        return 'Inmediata';
      case '3m':
        return 'En 3 meses';
      case '6m':
        return 'En 6 meses';
      case 'exploring':
        return 'Explorando opciones';
      default:
        return value || 'Sin dato';
    }
  }

  public ambianceLabel(value: string | null | undefined): string {
    switch (value) {
      case 'small':
        return 'Residencia pequeña y familiar';
      case 'large':
        return 'Residencia grande con actividades';
      case 'either':
        return 'Indistinto';
      default:
        return value || 'Sin dato';
    }
  }

  public async addMember(): Promise<void> {
    if (!this.companyId) {
      alert('Primero vincula una empresa.');
      return;
    }

    const email = this.memberEmail.trim();
    if (!email) {
      alert('Ingresa un email.');
      return;
    }

    this.saving = true;
    try {
      const { data: profile, error: profileError } = await this.supabase.client
        .from('profiles')
        .select('id,email,full_name')
        .ilike('email', email)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!profile?.id) {
        alert('No existe un usuario con ese email. Pídele que se registre primero.');
        return;
      }

      const { error: insertError } = await this.supabase.client.from('company_members').upsert(
        {
          company_id: this.companyId,
          user_id: profile.id,
          member_role: this.memberRole,
        } as any,
        { onConflict: 'company_id,user_id' }
      );
      if (insertError) throw insertError;

      // Sincronizar con HubSpot si es un empleado
      if (this.memberRole === 'employee') {
        try {
          const parts = (profile.full_name || '').split(' ');
          const firstname = parts[0] || '';
          const lastname = parts.slice(1).join(' ') || '';

          const { data: hubspotData, error: hubspotError } = await this.supabase.client.functions.invoke(
            'hubspot-integration',
            {
              body: {
                action: 'create_contact',
                email: profile.email,
                firstname: firstname,
                lastname: lastname,
                companyId: this.companyId,
              },
            }
          );

          const hubspotMessage = hubspotError || hubspotData?.error;
          if (hubspotMessage) {
            console.warn('El empleado fue agregado localmente, pero falló la sincronización con HubSpot:', hubspotMessage);
          }
        } catch (hubspotErr) {
          console.warn('Error inesperado llamando a HubSpot:', hubspotErr);
        }
      }

      this.memberEmail = '';
      this.memberRole = 'employee';
      await this.loadMembers();
      await this.loadMetrics();
    } catch (err: any) {
      console.error(err);
      alert(`No se pudo agregar: ${err?.message ?? String(err)}`);
    } finally {
      this.saving = false;
    }
  }

  public async updateMemberRole(m: MemberRow): Promise<void> {
    if (!this.companyId) return;
    this.saving = true;
    try {
      const { error } = await this.supabase.client
        .from('company_members')
        .update({ member_role: m.member_role } as any)
        .eq('company_id', this.companyId)
        .eq('user_id', m.user_id);
      if (error) throw error;
      await this.loadMembers();
    } catch (err: any) {
      console.error(err);
      alert(`No se pudo actualizar rol: ${err?.message ?? String(err)}`);
    } finally {
      this.saving = false;
    }
  }

  public async removeMember(m: MemberRow): Promise<void> {
    if (!this.companyId) return;
    if (!confirm('Â¿Eliminar este miembro de la empresa?')) return;

    this.saving = true;
    try {
      const { error } = await this.supabase.client
        .from('company_members')
        .delete()
        .eq('company_id', this.companyId)
        .eq('user_id', m.user_id);
      if (error) throw error;
      await this.loadMembers();
      await this.loadMetrics();
    } catch (err: any) {
      console.error(err);
      alert(`No se pudo eliminar: ${err?.message ?? String(err)}`);
    } finally {
      this.saving = false;
    }
  }

  private async loadBranding(): Promise<void> {
    if (!this.companyId) return;
    const { data, error } = await this.supabase.client
      .from('company_branding')
      .select('logo_url,primary_color,secondary_color')
      .eq('company_id', this.companyId)
      .maybeSingle();
    if (error) throw error;

    this.branding = {
      logo_url: data?.logo_url ?? null,
      primary_color: data?.primary_color ?? '#1b4dff',
      secondary_color: data?.secondary_color ?? '#6366f1',
    };
  }

  public async saveBranding(): Promise<void> {
    if (!this.companyId) return;
    this.saving = true;
    try {
      const { error } = await this.supabase.client.from('company_branding').upsert({
        company_id: this.companyId,
        logo_url: this.branding.logo_url || null,
        primary_color: this.branding.primary_color || null,
        secondary_color: this.branding.secondary_color || null,
      } as any);
      if (error) throw error;
      await this.loadBranding();
    } catch (err: any) {
      console.error(err);
      alert(`No se pudo guardar branding: ${err?.message ?? String(err)}`);
    } finally {
      this.saving = false;
    }
  }

  private async loadVouchers(): Promise<void> {
    if (!this.companyId) return;
    const { data, error } = await this.supabase.client
      .from('vouchers')
      .select('id,code,title,description,active')
      .eq('company_id', this.companyId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    this.vouchers = (data ?? []) as VoucherRow[];
  }

  public async createVoucher(): Promise<void> {
    if (!this.companyId) {
      alert('Primero vincula una empresa.');
      return;
    }

    const code = this.voucherDraft.code.trim().toUpperCase().replace(/\s+/g, '');
    const title = this.voucherDraft.title.trim();
    if (!code || !title) {
      alert('Ingresa código y título.');
      return;
    }

    this.saving = true;
    try {
      const { error } = await this.supabase.client.from('vouchers').insert({
        company_id: this.companyId,
        code,
        title,
        description: this.voucherDraft.description.trim() || null,
        active: this.voucherDraft.active,
        discount_type: 'text',
      } as any);
      if (error) throw error;

      this.voucherDraft = { code: '', title: '', description: '', active: true };
      await this.loadVouchers();
      await this.loadMetrics();
    } catch (err: any) {
      console.error(err);
      alert(`No se pudo crear voucher: ${err?.message ?? String(err)}`);
    } finally {
      this.saving = false;
    }
  }

  public async toggleVoucher(v: VoucherRow): Promise<void> {
    this.saving = true;
    try {
      const { error } = await this.supabase.client.from('vouchers').update({ active: !v.active }).eq('id', v.id);
      if (error) throw error;
      await this.loadVouchers();
      await this.loadMetrics();
    } catch (err: any) {
      console.error(err);
      alert(`No se pudo actualizar voucher: ${err?.message ?? String(err)}`);
    } finally {
      this.saving = false;
    }
  }

  private readonly defaultSteps = [
    'Definir branding (logo/colores)',
    'Invitar miembros',
    'Publicar vouchers',
    'Lanzar comunicación interna',
  ] as const;

  private readonly defaultStepKeys = ['branding', 'members', 'vouchers', 'launch'] as const;

  private async loadOnboarding(): Promise<void> {
    if (!this.companyId) return;

    const { data, error } = await this.supabase.client
      .from('company_onboarding')
      .select('id,step_key,status')
      .eq('company_id', this.companyId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    this.onboarding = (data ?? []) as OnboardingRow[];

    if (!this.onboarding.length) {
      await this.ensureDefaultOnboarding();
      await this.loadOnboarding();
    }
  }

  private async ensureDefaultOnboarding(): Promise<void> {
    if (!this.companyId) return;
    const payload = this.defaultStepKeys.map((k) => ({
      company_id: this.companyId,
      step_key: k,
      status: 'pending',
    }));
    const { error } = await this.supabase.client.from('company_onboarding').upsert(payload as any, {
      onConflict: 'company_id,step_key',
    });
    if (error) throw error;
  }

  public stepLabel(stepKey: string): string {
    const idx = this.defaultStepKeys.findIndex((k) => k === stepKey);
    return idx >= 0 ? this.defaultSteps[idx]! : stepKey;
  }

  public stepDescription(stepKey: string): string {
    switch (stepKey) {
      case 'branding':
        return 'Configura logo, colores y look & feel para que el portal se vea interno.';
      case 'members':
        return 'Invita a RR.HH., managers y colaboradores que usarán el beneficio.';
      case 'vouchers':
        return 'Publica beneficios o descuentos que quedarán visibles para empleados.';
      case 'launch':
        return 'Confirma comunicación interna, correo de lanzamiento y mensajes de adopción.';
      default:
        return 'Paso operativo del onboarding corporativo.';
    }
  }

  public stepActionLabel(stepKey: string): string {
    switch (stepKey) {
      case 'branding':
        return 'Abrir Branding';
      case 'members':
        return 'Abrir Miembros';
      case 'vouchers':
        return 'Abrir Vouchers';
      case 'launch':
        return 'Ver checklist';
      default:
        return 'Abrir';
    }
  }

  public openOnboardingStep(stepKey: string): void {
    switch (stepKey) {
      case 'branding':
        this.tab = 'Branding';
        break;
      case 'members':
        this.tab = 'Miembros';
        break;
      case 'vouchers':
        if (this.isTabVisible('Vouchers')) {
          this.tab = 'Vouchers';
        }
        break;
      default:
        this.tab = 'Onboarding';
        break;
    }
  }

  public onboardingStatusLabel(status: OnboardingStatus): string {
    switch (status) {
      case 'done':
        return 'Listo';
      case 'skipped':
        return 'Omitido';
      default:
        return 'Pendiente';
    }
  }

  public async saveOnboardingStep(s: OnboardingRow): Promise<void> {
    this.saving = true;
    try {
      const { error } = await this.supabase.client
        .from('company_onboarding')
        .update({ status: s.status } as any)
        .eq('id', s.id);
      if (error) throw error;
      await this.loadMetrics();
    } catch (err: any) {
      console.error(err);
      alert(`No se pudo actualizar onboarding: ${err?.message ?? String(err)}`);
    } finally {
      this.saving = false;
    }
  }

  private async loadMetrics(): Promise<void> {
    if (!this.companyId) return;

    const rangeDays = this.rangeToDays(this.metricsRange);
    const rangeStart = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();

    const memberIds = this.members.map((member) => member.user_id).filter(Boolean);
    const thirtyDaysAhead = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const [employees, vouchersActive, vouchersExpiring, onboardingDone, analytics30d, activeUserRows, enquiries] = await Promise.all([
      this.supabase.client
        .from('company_members')
        .select('user_id', { count: 'exact', head: true })
        .eq('company_id', this.companyId),
      this.supabase.client
        .from('vouchers')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', this.companyId)
        .eq('active', true),
      this.supabase.client
        .from('vouchers')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', this.companyId)
        .eq('active', true)
        .not('ends_at', 'is', null)
        .gte('ends_at', new Date().toISOString())
        .lte('ends_at', thirtyDaysAhead),
      this.supabase.client
        .from('company_onboarding')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', this.companyId)
        .eq('status', 'done'),
      this.supabase.client
        .from('analytics_events')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', this.companyId)
        .gte('created_at', rangeStart),
      this.supabase.client
        .from('analytics_events')
        .select('user_id')
        .eq('company_id', this.companyId)
        .gte('created_at', rangeStart),
      memberIds.length
        ? this.supabase.client
            .from('care_requests')
            .select('id', { count: 'exact', head: true })
            .in('employee_id', memberIds)
            .gte('created_at', rangeStart)
        : Promise.resolve({ count: 0 } as { count: number | null }),
    ]);

    const activeUsers = new Set(
      ((activeUserRows.data ?? []) as Array<{ user_id: string | null }>).map((row) => row.user_id).filter(Boolean)
    ).size;

    this.metrics = {
      employees: employees.count ?? 0,
      vouchersActive: vouchersActive.count ?? 0,
      vouchersExpiring: vouchersExpiring.count ?? 0,
      onboardingDone: onboardingDone.count ?? 0,
      analytics30d: analytics30d.count ?? 0,
      activeUsers,
      enquiries: enquiries.count ?? 0,
    };
  }

  public get hubspotTotalLeads(): number {
    return Object.values(this.hubspotLeadStatusMetrics).reduce((acc, value) => acc + value, 0);
  }

  public get hubspotStatusCards(): Array<{ label: string; value: number }> {
    return [
      { label: 'Nuevos', value: this.hubspotLeadStatusMetrics.nuevo },
      { label: 'Contactados', value: this.hubspotLeadStatusMetrics.contactado },
      { label: 'En evaluación', value: this.hubspotLeadStatusMetrics.evaluacion },
      { label: 'Match', value: this.hubspotLeadStatusMetrics.match },
      { label: 'Cerrados', value: this.hubspotLeadStatusMetrics.cerrado },
      { label: 'Perdidos', value: this.hubspotLeadStatusMetrics.perdido },
    ];
  }

  private async loadHubspotMetrics(): Promise<void> {
    if (!this.companyId) return;

    this.hubspotLoading = true;
    this.hubspotError = '';
    this.hubspotPipeline = null;
    this.hubspotLeadStatusMetrics = {
      nuevo: 0,
      contactado: 0,
      evaluacion: 0,
      match: 0,
      cerrado: 0,
      perdido: 0,
    };

    try {
      const rangeDays = this.rangeToDays(this.metricsRange);
      const { data, error } = await this.supabase.client.functions.invoke(
        'hubspot-integration',
        { body: { action: 'list_pipeline_summary', rangeDays, companyId: this.companyId } }
      );
      
      if (error) throw error;
      if (!data) {
        throw new Error('Respuesta vacía desde HubSpot.');
      }
      if (data.error) {
        throw new Error(data.error);
      }

      this.hubspotPipeline = (data.pipeline as { id: string; label: string } | null) ?? null;
      this.hubspotLeadStatusMetrics = {
        nuevo: Number(data.leadStatusMetrics?.nuevo ?? 0),
        contactado: Number(data.leadStatusMetrics?.contactado ?? 0),
        evaluacion: Number(data.leadStatusMetrics?.evaluacion ?? 0),
        match: Number(data.leadStatusMetrics?.match ?? 0),
        cerrado: Number(data.leadStatusMetrics?.cerrado ?? 0),
        perdido: Number(data.leadStatusMetrics?.perdido ?? 0),
      };
    } catch (err: any) {
      console.error('HubSpot metrics error', err);
      if (err?.message && err.message !== 'Edge Function returned a non-2xx status code') {
        this.hubspotError = String(err.message);
      } else {
        this.hubspotError = 'No se pudieron cargar métricas HubSpot.';
      }
    } finally {
      this.hubspotLoading = false;
    }
  }

  public trackById(_: number, item: { id?: string; user_id?: string }): string {
    return (item.id ?? item.user_id) as string;
  }

  public get onboardingPercent(): number {
    if (!this.defaultStepKeys.length) return 0;
    return Math.min(100, Math.round((this.metrics.onboardingDone / this.defaultStepKeys.length) * 100));
  }

  public get monthlyPeak(): number {
    return Math.max(...this.monthlyActivity.map((item) => item.value), 1);
  }

  public get analyticsAverage(): number {
    const denominator = this.monthlyActivity.length || 1;
    return Math.round(this.monthlyActivity.reduce((acc, item) => acc + item.value, 0) / denominator);
  }

  public async setMetricsRange(range: MetricsRange): Promise<void> {
    if (this.metricsRange === range) return;
    this.metricsRange = range;
    await this.loadMetrics();
    await this.loadHubspotMetrics();
    await this.loadMonitoringData();
  }

  public sparklinePoints(values: number[]): string {
    if (!values.length) return '';
    const max = Math.max(...values, 1);
    const width = 100;
    const height = 30;
    const step = values.length > 1 ? width / (values.length - 1) : width;
    return values
      .map((value, index) => {
        const x = index * step;
        const y = height - (value / max) * height;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
  }

  private rangeToDays(range: MetricsRange): number {
    if (range === '7d') return 7;
    if (range === '90d') return 90;
    return 30;
  }

  private formatBucketLabel(date: Date): string {
    return new Intl.DateTimeFormat('es-CL', { month: 'short' }).format(date).replace('.', '');
  }

  private async loadMonitoringData(): Promise<void> {
    if (!this.companyId) return;

    const rangeDays = this.rangeToDays(this.metricsRange);
    const startDate = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000);

    const { data: events, error: eventsError } = await this.supabase.client
      .from('analytics_events')
      .select('created_at')
      .eq('company_id', this.companyId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (eventsError) throw eventsError;

    const points = 12;
    const bucketMs = Math.max(1, Math.floor((Date.now() - startDate.getTime()) / points));
    const buckets = new Array(points).fill(0);

    for (const event of events ?? []) {
      const createdAt = new Date((event as any).created_at as string).getTime();
      const idx = Math.min(points - 1, Math.max(0, Math.floor((createdAt - startDate.getTime()) / bucketMs)));
      buckets[idx] += 1;
    }

    this.trafficSummary = buckets;
    this.occupancyTrend = buckets.map((_, index) =>
      buckets.slice(0, index + 1).reduce((acc, value) => acc + value, 0)
    );

    this.monthlyActivity = buckets.map((value, index) => {
      const labelDate = new Date(startDate.getTime() + bucketMs * index);
      return {
        label: this.formatBucketLabel(labelDate),
        value,
      };
    });

    const memberIds = this.members.map((m) => m.user_id);
    if (!memberIds.length) {
      this.recentEnquiries = [];
      return;
    }

    const { data: requests, error: requestsError } = await this.supabase.client
      .from('care_requests')
      .select('id, topic, employee_id, created_at')
      .in('employee_id', memberIds)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(50);

    if (requestsError) throw requestsError;

    const requestBuckets = new Array(points).fill(0);
    for (const request of requests ?? []) {
      const createdAt = new Date((request as any).created_at as string).getTime();
      const idx = Math.min(points - 1, Math.max(0, Math.floor((createdAt - startDate.getTime()) / bucketMs)));
      requestBuckets[idx] += 1;
    }
    this.revenueTrend = requestBuckets;

    this.recentEnquiries = (requests ?? []).slice(0, 5).map((request: any) => {
      const date = new Date(request.created_at as string);
      return {
        id: (request.id as string).slice(0, 8),
        property: (request.topic as string) || 'Consulta',
        employee: this.memberLabel((request.employee_id as string) || null),
        date: new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short' }).format(date),
      };
    });
  }

  public get filteredCareIntakes(): CareIntakeRow[] {
    const query = this.careIntakeSearch.trim().toLowerCase();
    if (!query) return this.careIntakes;

    return this.careIntakes.filter((intake) => {
      const member = this.memberLabel(intake.employee_id).toLowerCase();
      const clinical = this.clinicalProfileLabel(intake.payload?.clinical_profile).toLowerCase();
      const postalCode = String(intake.payload?.location?.postal_code ?? '').toLowerCase();
      const funding = this.fundingLabel(intake.payload?.budget?.funding).toLowerCase();
      return [member, clinical, postalCode, funding].some((value) => value.includes(query));
    });
  }

  public intakeAmenityLabels(intake: CareIntakeRow | null): string[] {
    const amenities = intake?.payload?.lifestyle?.amenities ?? {};
    const labels: string[] = [];
    if (amenities.ensuite) labels.push('Baño privado');
    if (amenities.garden) labels.push('Jardines');
    if (amenities.library) labels.push('Biblioteca');
    if (amenities.pets) labels.push('Permite mascotas');
    return labels;
  }

  public showIntake(intake: CareIntakeRow) {
    this.selectedIntake = intake;
  }

  public closeIntakeModal() {
    this.selectedIntake = null;
  }
}
