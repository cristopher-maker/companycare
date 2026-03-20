import { Component } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { SupabaseService } from '../../core/services/supabase.service';

type CompanyTab = 'Miembros' | 'Branding' | 'Vouchers' | 'Onboarding' | 'Métricas';

type CompanyRow = {
  id: string;
  name: string;
  domain: string | null;
  tax_id: string | null;
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

@Component({
  selector: 'app-company',
  templateUrl: './company.page.html',
  styleUrls: ['./company.page.scss'],
})
export class CompanyPage {
  public tab: CompanyTab = 'Miembros';

  public loading = true;
  public saving = false;
  public isCompanyAdmin = false;

  public companyId: string | null = null;
  public company: CompanyRow | null = null;

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

  public metrics: { employees: number; vouchersActive: number; onboardingDone: number; analytics30d: number } = {
    employees: 0,
    vouchersActive: 0,
    onboardingDone: 0,
    analytics30d: 0,
  };

  constructor(
    private readonly auth: AuthService,
    private readonly supabase: SupabaseService
  ) {}

  public async ionViewWillEnter(): Promise<void> {
    await this.refresh();
  }

  public async refresh(): Promise<void> {
    this.loading = true;
    try {
      await this.loadRoleAndCompany();

      // If admin role but not linked to a company yet, keep UI available to "crear/vincular".
      if (!this.isCompanyAdmin) return;
      if (!this.companyId) return;

      await Promise.all([
        this.loadCompany(),
        this.loadMembers(),
        this.loadBranding(),
        this.loadVouchers(),
        this.loadOnboarding(),
        this.loadMetrics(),
      ]);
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
        .insert({ name, tax_id: taxId, domain })
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
      .select('id,name,domain,tax_id')
      .eq('id', this.companyId)
      .maybeSingle();
    if (error) throw error;
    this.company = (data ?? null) as CompanyRow | null;
  }

  private async loadMembers(): Promise<void> {
    if (!this.companyId) return;
    const { data, error } = await this.supabase.client
      .from('company_members')
      .select('user_id, member_role, profiles:profiles(full_name,email)')
      .eq('company_id', this.companyId)
      .order('created_at', { ascending: true });
    if (error) throw error;

    this.members = (data ?? []).map((row: any) => ({
      user_id: row.user_id as string,
      member_role: row.member_role as MemberRole,
      full_name: row.profiles?.full_name ?? null,
      email: row.profiles?.email ?? null,
    }));
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
    if (!confirm('¿Eliminar este miembro de la empresa?')) return;

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

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [employees, vouchersActive, onboardingDone, analytics30d] = await Promise.all([
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
        .from('company_onboarding')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', this.companyId)
        .eq('status', 'done'),
      this.supabase.client
        .from('analytics_events')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', this.companyId)
        .gte('created_at', thirtyDaysAgo),
    ]);

    this.metrics = {
      employees: employees.count ?? 0,
      vouchersActive: vouchersActive.count ?? 0,
      onboardingDone: onboardingDone.count ?? 0,
      analytics30d: analytics30d.count ?? 0,
    };
  }

  public trackById(_: number, item: { id?: string; user_id?: string }): string {
    return (item.id ?? item.user_id) as string;
  }
}

