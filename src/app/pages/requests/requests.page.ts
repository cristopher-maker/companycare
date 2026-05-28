import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { UiService } from '../../core/services/ui.service';

type CareRequestRow = {
  id: string;
  topic: string;
  channel: string;
  status: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  appointment?: AppointmentSummary | null;
};

type AppointmentSummary = {
  id: string;
  request_id: string | null;
  kind: 'Videollamada' | 'Llamada';
  scheduled_for: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  meeting_url: string | null;
};

@Component({
  selector: 'app-requests',
  templateUrl: './requests.page.html',
  styleUrls: ['./requests.page.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class RequestsPage implements OnInit, OnDestroy {
  public loading = true;
  public error: string | null = null;
  public items: CareRequestRow[] = [];
  public currentPage = 1;
  public readonly pageSize = 6;

  private unsub?: { data: { subscription: { unsubscribe: () => void } } };

  constructor(
    private readonly supabase: SupabaseService,
    public readonly ui: UiService
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

    const { data: sessionData } = await this.supabase.client.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) {
      this.items = [];
      this.loading = false;
      return;
    }

    try {
      const { data, error } = await this.supabase.client
        .from('care_requests')
        .select('id, topic, channel, status, created_at')
        .eq('employee_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const requests = (data ?? []) as CareRequestRow[];
      const requestIds = requests.map((item) => item.id);
      let appointmentsByRequestId = new Map<string, AppointmentSummary>();

      if (requestIds.length) {
        const { data: appointments, error: appointmentsError } = await this.supabase.client
          .from('appointments')
          .select('id, request_id, kind, scheduled_for, status, meeting_url')
          .in('request_id', requestIds)
          .order('scheduled_for', { ascending: true });

        if (appointmentsError) throw appointmentsError;

        appointmentsByRequestId = ((appointments ?? []) as AppointmentSummary[])
          .filter((appointment) => !!appointment.request_id)
          .reduce((map, appointment) => {
            const requestId = appointment.request_id as string;
            const current = map.get(requestId);
            const appointmentTime = new Date(appointment.scheduled_for).getTime();
            const currentTime = current ? new Date(current.scheduled_for).getTime() : Number.POSITIVE_INFINITY;
            if (!current || appointmentTime < currentTime) {
              map.set(requestId, appointment);
            }
            return map;
          }, new Map<string, AppointmentSummary>());
      }

      this.items = requests.map((item) => ({
        ...item,
        appointment: appointmentsByRequestId.get(item.id) ?? null,
      }));
      const totalPages = this.totalPages;
      if (this.currentPage > totalPages) this.currentPage = totalPages;
    } catch (err: any) {
      this.error = err.message;
    } finally {
      this.loading = false;
    }
  }

  public statusLabel(status: CareRequestRow['status']): string {
    const labels: Record<CareRequestRow['status'], string> = {
      open: 'Abierto', assigned: 'Asignado', in_progress: 'En Progreso', resolved: 'Resuelto', closed: 'Cerrado',
    };
    return labels[status] ?? status;
  }

  public statusClass(status: CareRequestRow['status']): string {
    const classes: Record<CareRequestRow['status'], string> = {
      open: 'request-card__status--open',
      assigned: 'request-card__status--assigned',
      in_progress: 'request-card__status--in-progress',
      resolved: 'request-card__status--resolved',
      closed: 'request-card__status--closed',
    };
    return classes[status] ?? 'request-card__status--closed';
  }

  public displayDate(item: CareRequestRow): string {
    return item.appointment?.scheduled_for ?? item.created_at;
  }

  public hasVideoMeeting(item: CareRequestRow): boolean {
    return item.appointment?.kind === 'Videollamada' && !!item.appointment.meeting_url;
  }

  public isPendingVideoMeeting(item: CareRequestRow): boolean {
    return item.appointment?.kind === 'Videollamada' && !item.appointment.meeting_url;
  }

  public get openRequestsCount(): number {
    return this.items.filter((item) => item.status === 'open' || item.status === 'assigned' || item.status === 'in_progress').length;
  }

  public get closedRequestsCount(): number {
    return this.items.filter((item) => item.status === 'resolved' || item.status === 'closed').length;
  }

  public get totalPages(): number {
    return Math.max(1, Math.ceil(this.items.length / this.pageSize));
  }

  public get pages(): number[] {
    const maxPagesToShow = 7;
    let start = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let end = Math.min(this.totalPages, start + maxPagesToShow - 1);

    if (end - start + 1 < maxPagesToShow) {
      start = Math.max(1, end - maxPagesToShow + 1);
    }

    const result: number[] = [];
    for (let i = start; i <= end; i += 1) {
      result.push(i);
    }
    return result;
  }

  public get visibleItems(): CareRequestRow[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.items.slice(start, start + this.pageSize);
  }

  public goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  public prevPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  public nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  public openMeeting(event: MouseEvent, url: string | null | undefined): void {
    event.preventDefault();
    event.stopPropagation();
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
