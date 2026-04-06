import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { SupabaseService } from '../../core/services/supabase.service';

type CompanyRequestRow = {
  id: string;
  channel: string;
  topic: string;
  status: string;
  created_at: string;
  employee_id: string;
  employee_name: string | null;
  employee_email: string | null;
};

@Component({
  selector: 'app-company-requests',
  templateUrl: './company-requests.page.html',
  styleUrls: ['./company-requests.page.scss'],
})
export class CompanyRequestsPage implements OnInit, OnDestroy {
  public loading = true;
  public error: string | null = null;
  public items: CompanyRequestRow[] = [];
  public companyName: string | null = null;

  private unsub?: { data: { subscription: { unsubscribe: () => void } } };

  constructor(
    private readonly supabase: SupabaseService,
    private readonly router: Router
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
    this.items = [];
    this.companyName = null;

    const { data: sessionData, error: sessionError } = await this.supabase.client.auth.getSession();
    if (sessionError) {
      this.loading = false;
      this.error = sessionError.message;
      return;
    }

    const userId = sessionData.session?.user?.id;
    if (!userId) {
      this.loading = false;
      await this.router.navigateByUrl('/login');
      return;
    }

    try {
      const { data: profile, error: profileError } = await this.supabase.client
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) throw profileError;

      const role = (profile?.role as string | undefined) ?? 'employee';
      if (role !== 'company_admin' && role !== 'manager' && role !== 'admin') {
        await this.router.navigateByUrl('/requests');
        this.loading = false;
        return;
      }

      const { data: membership, error: membershipError } = await this.supabase.client
        .from('company_members')
        .select('company_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (membershipError) throw membershipError;

      const companyId = (membership?.company_id as string | undefined) ?? null;
      if (!companyId) {
        this.loading = false;
        this.error = 'No tienes una empresa vinculada.';
        return;
      }

      const [{ data: company }, { data: members, error: membersError }] = await Promise.all([
        this.supabase.client.from('companies').select('name').eq('id', companyId).maybeSingle(),
        this.supabase.client
          .from('company_members')
          .select('user_id, profiles:profiles(full_name,email)')
          .eq('company_id', companyId),
      ]);

      if (membersError) throw membersError;

      this.companyName = (company?.name as string | undefined) ?? null;

      const employeeIds = (members ?? [])
        .map((member: any) => member.user_id as string)
        .filter((value): value is string => !!value);

      const memberMeta = new Map<string, { name: string | null; email: string | null }>();
      for (const member of members ?? []) {
        const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
        memberMeta.set(member.user_id as string, {
          name: profile?.full_name ?? null,
          email: profile?.email ?? null,
        });
      }

      if (!employeeIds.length) {
        this.loading = false;
        return;
      }

      const { data: requests, error: requestsError } = await this.supabase.client
        .from('care_requests')
        .select('id, channel, topic, status, created_at, employee_id')
        .in('employee_id', employeeIds)
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      this.items = (requests ?? []).map((request: any) => {
        const meta = memberMeta.get(request.employee_id as string);
        return {
          id: request.id as string,
          channel: request.channel as string,
          topic: request.topic as string,
          status: request.status as string,
          created_at: request.created_at as string,
          employee_id: request.employee_id as string,
          employee_name: meta?.name ?? null,
          employee_email: meta?.email ?? null,
        };
      });
    } catch (err: any) {
      this.error = err?.message ?? 'No se pudieron cargar los casos.';
    } finally {
      this.loading = false;
    }
  }
}
