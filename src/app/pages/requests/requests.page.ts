import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { SupabaseService } from '../../core/services/supabase.service';

type CareRequestRow = {
  id: string;
  channel: string;
  topic: string;
  status: string;
  created_at: string;
  details: string | null;
  appointment?: {
    kind: string;
    scheduled_for: string;
    meeting_code: string | null;
    status: string;
  } | null;
};

@Component({
  selector: 'app-requests',
  templateUrl: './requests.page.html',
  styleUrls: ['./requests.page.scss'],
})
export class RequestsPage implements OnInit, OnDestroy {
  public loading = true;
  public error: string | null = null;
  public items: CareRequestRow[] = [];

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

    const { data: sessionData, error: sessionError } = await this.supabase.client.auth.getSession();
    if (sessionError) {
      this.loading = false;
      this.error = sessionError.message;
      return;
    }

    const userId = sessionData.session?.user?.id;
    if (!userId) {
      this.loading = false;
      this.items = [];
      return;
    }

    try {
      const { data: profile, error: profileError } = await this.supabase.client
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) throw profileError;

      const role = profile?.role as string | undefined;
      if (role === 'company_admin' || role === 'manager') {
        await this.router.navigateByUrl('/company');
        this.loading = false;
        this.items = [];
        return;
      }
    } catch {
      this.loading = false;
      this.error = 'No se pudo validar el acceso.';
      return;
    }

    const { data, error } = await this.supabase.client
      .from('care_requests')
      .select('id, channel, topic, status, created_at, details')
      .eq('employee_id', userId)
      .order('created_at', { ascending: false });

    this.loading = false;
    if (error) {
      this.error = error.message;
      return;
    }

    const requests = (data ?? []) as CareRequestRow[];
    const requestIds = requests.map((item) => item.id);

    if (!requestIds.length) {
      this.items = [];
      return;
    }

    const { data: appointments } = await this.supabase.client
      .from('appointments')
      .select('request_id, kind, scheduled_for, meeting_code, status')
      .in('request_id', requestIds)
      .order('scheduled_for', { ascending: true });

    const appointmentByRequestId = new Map<string, CareRequestRow['appointment']>();
    for (const appointment of appointments ?? []) {
      const requestId = appointment.request_id as string | null;
      if (!requestId || appointmentByRequestId.has(requestId)) {
        continue;
      }

      appointmentByRequestId.set(requestId, {
        kind: (appointment.kind as string) ?? 'Sesión',
        scheduled_for: appointment.scheduled_for as string,
        meeting_code: (appointment.meeting_code as string | null | undefined) ?? null,
        status: (appointment.status as string) ?? 'scheduled',
      });
    }

    this.items = requests.map((item) => ({
      ...item,
      appointment: appointmentByRequestId.get(item.id) ?? null,
    }));
  }

  public statusLabel(status: string): string {
    switch (status) {
      case 'open':
        return 'Abierta';
      case 'assigned':
        return 'Asignada';
      case 'in_progress':
        return 'En progreso';
      case 'resolved':
        return 'Resuelta';
      case 'closed':
        return 'Cerrada';
      default:
        return status;
    }
  }

  public appointmentStatusLabel(status: string): string {
    switch (status) {
      case 'scheduled':
        return 'Agendada';
      case 'confirmed':
        return 'Confirmada';
      case 'completed':
        return 'Completada';
      case 'cancelled':
        return 'Cancelada';
      default:
        return status;
    }
  }

  public detailPreview(details: string | null): string {
    const value = details?.trim();
    if (!value) {
      return 'Sin contexto adicional informado.';
    }

    return value.length > 180 ? `${value.slice(0, 180)}...` : value;
  }
}
