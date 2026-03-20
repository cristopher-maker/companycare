import { Component, OnDestroy, OnInit } from '@angular/core';

import { SupabaseService } from '../../core/services/supabase.service';

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

  private unsub?: { data: { subscription: { unsubscribe: () => void } } };

  constructor(private readonly supabase: SupabaseService) {}

  public ngOnInit(): void {
    void this.refresh();
    this.unsub = this.supabase.client.auth.onAuthStateChange(() => void this.refresh());
  }

  public ngOnDestroy(): void {
    this.unsub?.data.subscription.unsubscribe();
  }

  public async refresh(): Promise<void> {
    this.loading = true;
    this.companyName = null;
    this.stats = [];
    this.recentRequests = [];
    this.featuredResources = [];
    this.upcomingEvents = [];

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

    if (this.mode === 'company') {
      const company = await this.getMyCompany(user.id);
      this.companyName = company?.name ?? null;
      await this.loadCompanyDashboard(company?.id ?? null);
    } else {
      await this.loadEmployeeDashboard(user.id);
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

  private async loadEmployeeDashboard(userId: string): Promise<void> {
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

    this.stats = [
      {
        label: 'Solicitudes abiertas',
        value: openRequests.count ?? 0,
        icon: 'chatbubbles-outline',
      },
      {
        label: 'Proveedores activos',
        value: providersCount.count ?? 0,
        icon: 'shield-checkmark-outline',
      },
      {
        label: 'Recursos',
        value: resourcesCount.count ?? 0,
        icon: 'library-outline',
      },
      {
        label: 'Vouchers disponibles',
        value: vouchersCount.count ?? 0,
        icon: 'ticket-outline',
      },
    ];

    this.recentRequests = (recentRequests.data ?? []) as RecentRequest[];
    this.featuredResources = (featuredResources.data ?? []) as FeaturedResource[];
    this.upcomingEvents = (upcomingEvents.data ?? []) as UpcomingEvent[];
  }

  private async loadCompanyDashboard(companyId: string | null): Promise<void> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [employeesCount, vouchersCount, onboardingDone, analytics7d] =
      await Promise.all([
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

    this.stats = [
      {
        label: 'Empleados (empresa)',
        value: employeesCount.count ?? 0,
        icon: 'people-outline',
      },
      {
        label: 'Vouchers activos',
        value: vouchersCount.count ?? 0,
        icon: 'ticket-outline',
      },
      {
        label: 'Onboarding listo',
        value: onboardingDone.count ?? 0,
        icon: 'checkmark-done-outline',
      },
      {
        label: 'Eventos (7 días)',
        value: analytics7d.count ?? 0,
        icon: 'pulse-outline',
      },
    ];

    // Company view: show recent platform activity as a starting point.
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

    this.recentRequests = (recent?.map((r) => r) ?? []) as RecentRequest[];
    this.featuredResources = (resources ?? []) as FeaturedResource[];
    this.upcomingEvents = (events ?? []) as UpcomingEvent[];

  }
}
