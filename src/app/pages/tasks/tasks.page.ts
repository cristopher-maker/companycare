import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';
 
type CareTaskStatus = 'pending' | 'in_progress' | 'done';
type TaskPriority   = 'low' | 'medium' | 'high';
 
export type CareTaskRow = {
  id: string;
  request_id: string | null;
  employee_id: string;
  created_by: string;
  title: string;
  notes: string | null;
  due_at: string | null;
  priority: TaskPriority;
  status: CareTaskStatus;
  created_at: string;
  request_topic?: string | null;
};
 
type FilterValue = 'all' | CareTaskStatus;
 
@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.page.html',
  styleUrls: ['./tasks.page.scss'],
})
export class TasksPage implements OnInit, OnDestroy {
 
  // ── estado público ───────────────────────────
  public loading  = true;
  public saving   = false;
  public error: string | null = null;
 
  public items: CareTaskRow[] = [];
 
  public draftTitle   = '';
  public draftDueDate = '';
  public activeFilter: FilterValue = 'all';
 
  public readonly filterOptions: { value: FilterValue; label: string }[] = [
    { value: 'all',         label: 'Todas'       },
    { value: 'pending',     label: 'Pendientes'  },
    { value: 'in_progress', label: 'En progreso' },
    { value: 'done',        label: 'Completadas' },
  ];
 
  // ── estado privado ───────────────────────────
  private unsub?: { data: { subscription: { unsubscribe: () => void } } };
 
  constructor(
    private readonly supabase: SupabaseService,
    private readonly router: Router,
  ) {}
 
  // ── lifecycle ────────────────────────────────
  public ngOnInit(): void {
    void this.refresh();
    this.unsub = this.supabase.client.auth.onAuthStateChange(() => void this.refresh());
  }
 
  public ngOnDestroy(): void {
    this.unsub?.data.subscription.unsubscribe();
  }
 
  // ── getters computados (evitan lógica en el template) ──
  public get pendingCount(): number {
    return this.items.filter(t => t.status === 'pending').length;
  }
 
  public get inProgressCount(): number {
    return this.items.filter(t => t.status === 'in_progress').length;
  }
 
  public get completedCount(): number {
    return this.items.filter(t => t.status === 'done').length;
  }
 
  public get filteredItems(): CareTaskRow[] {
    return this.activeFilter === 'all'
      ? this.items
      : this.items.filter(t => t.status === this.activeFilter);
  }
 
  // ── filtros ──────────────────────────────────
  public setFilter(value: FilterValue): void {
    this.activeFilter = value;
  }
 
  public countByFilter(value: FilterValue): number {
    return value === 'all'
      ? this.items.length
      : this.items.filter(t => t.status === value).length;
  }
 
  // ── trackBy para *ngFor ──────────────────────
  public trackById(_: number, task: CareTaskRow): string {
    return task.id;
  }
 
  // ── etiquetas ────────────────────────────────
  public statusLabel(status: CareTaskStatus): string {
    const labels: Record<CareTaskStatus, string> = {
      pending:     'Pendiente',
      in_progress: 'En progreso',
      done:        'Hecha',
    };
    return labels[status];
  }
 
  // ── ciclo de estado con un click ─────────────
  public async cycleStatus(task: CareTaskRow): Promise<void> {
    const next: Record<CareTaskStatus, CareTaskStatus> = {
      pending:     'in_progress',
      in_progress: 'done',
      done:        'pending',
    };
    await this.updateTaskStatus(task, next[task.status]);
  }
 
  // ── datos ────────────────────────────────────
  public async refresh(): Promise<void> {
    this.loading = true;
    this.error   = null;
 
    const { data: sessionData, error: sessionError } = await this.supabase.client.auth.getSession();
    if (sessionError) {
      this.loading = false;
      this.error   = sessionError.message;
      return;
    }
 
    const userId = sessionData.session?.user?.id;
    if (!userId) {
      this.loading = false;
      this.items   = [];
      return;
    }
 
    // Redirección por rol
    const redirected = await this.redirectByRole(userId);
    if (redirected) return;
 
    // Cargar tareas
    const { data, error } = await this.supabase.client
      .from('care_tasks')
      .select('id, request_id, employee_id, created_by, title, notes, due_at, priority, status, created_at')
      .eq('employee_id', userId)
      .order('created_at', { ascending: true });
 
    this.loading = false;
 
    if (error) {
      this.error = error.message;
      return;
    }
 
    const tasks = (data ?? []) as CareTaskRow[];
    this.items  = await this.enrichWithTopics(tasks);
  }
 
  public async addTask(): Promise<void> {
    const title  = this.draftTitle.trim();
    const userId = (await this.supabase.client.auth.getSession()).data.session?.user?.id;
    if (!title || !userId) return;
 
    this.saving = true;
    try {
      const dueAt = this.draftDueDate
        ? new Date(`${this.draftDueDate}T23:59:00`).toISOString()
        : null;
 
      const { error } = await this.supabase.client.from('care_tasks').insert({
        employee_id: userId,
        created_by:  userId,
        title,
        due_at:   dueAt,
        priority: 'medium',
        status:   'pending',
      } as any);
 
      if (error) throw error;
 
      this.draftTitle   = '';
      this.draftDueDate = '';
      await this.refresh();
    } catch (err: any) {
      this.error = err?.message ?? 'No se pudo crear la tarea.';
    } finally {
      this.saving = false;
    }
  }
 
  public async updateTaskStatus(task: CareTaskRow, status: CareTaskStatus): Promise<void> {
    // Optimistic update
    task.status = status;
 
    const { error } = await this.supabase.client
      .from('care_tasks')
      .update({ status })
      .eq('id', task.id);
 
    if (error) {
      this.error = error.message;
      await this.refresh(); // revert on failure
    }
  }
 
  public async removeTask(task: CareTaskRow): Promise<void> {
    // Optimistic remove
    this.items = this.items.filter(t => t.id !== task.id);
 
    const { error } = await this.supabase.client
      .from('care_tasks')
      .delete()
      .eq('id', task.id);
 
    if (error) {
      this.error = error.message;
      await this.refresh(); // revert on failure
    }
  }
 
  // ── helpers privados ─────────────────────────
 
  private async redirectByRole(userId: string): Promise<boolean> {
    try {
      const { data: profile, error } = await this.supabase.client
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
 
      if (error) throw error;
 
      const role = profile?.role as string | undefined;
      const redirectMap: Record<string, string> = {
        company_admin: '/company',
        manager:       '/company',
        care_expert:   '/care-experts',
      };
 
      if (role && redirectMap[role]) {
        this.loading = false;
        this.items   = [];
        await this.router.navigateByUrl(redirectMap[role]);
        return true;
      }
    } catch {
      this.loading = false;
      this.error   = 'No se pudo validar el acceso.';
      return true;
    }
    return false;
  }
 
  private async enrichWithTopics(tasks: CareTaskRow[]): Promise<CareTaskRow[]> {
    const requestIds = Array.from(
      new Set(tasks.map(t => t.request_id).filter(Boolean))
    ) as string[];
 
    let topicMap = new Map<string, string>();
 
    if (requestIds.length) {
      const { data: requests } = await this.supabase.client
        .from('care_requests')
        .select('id, topic')
        .in('id', requestIds);
 
      topicMap = new Map(
        (requests ?? []).map((r: any) => [r.id as string, r.topic as string])
      );
    }
 
    return this.sortTasks(
      tasks.map(task => ({
        ...task,
        request_topic: task.request_id ? (topicMap.get(task.request_id) ?? null) : null,
      }))
    );
  }
 
  private sortTasks(tasks: CareTaskRow[]): CareTaskRow[] {
    const weight: Record<CareTaskStatus, number> = {
      pending:     0,
      in_progress: 1,
      done:        2,
    };
 
    return [...tasks].sort((a, b) => {
      if (a.status !== b.status) {
        return weight[a.status] - weight[b.status];
      }
 
      const aDue = a.due_at ? new Date(a.due_at).getTime() : Number.MAX_SAFE_INTEGER;
      const bDue = b.due_at ? new Date(b.due_at).getTime() : Number.MAX_SAFE_INTEGER;
      if (aDue !== bDue) return aDue - bDue;
 
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }
}