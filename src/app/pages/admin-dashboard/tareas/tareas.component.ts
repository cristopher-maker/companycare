import { Component } from '@angular/core';
import { AdminDashboardComponent } from '../admin-dashboard.component';

@Component({
  selector: 'app-tareas',
  templateUrl: './tareas.component.html'
})
export class TareasComponent {
  taskFilters = { query: '', status: 'all', entityType: 'all', priority: 'all' };

  constructor(public parent: AdminDashboardComponent) {}

  get filteredTareas() {
    const query = this.taskFilters.query.trim().toLowerCase();
    return this.parent.tareas.filter((tarea) => {
      const matchesStatus =
        this.taskFilters.status === 'all'
        || (this.taskFilters.status === 'overdue' && this.isTaskOverdue(tarea))
        || (this.taskFilters.status !== 'overdue' && tarea.status === this.taskFilters.status);
      const matchesEntity = this.taskFilters.entityType === 'all' || (tarea.entity_type || 'none') === this.taskFilters.entityType;
      const matchesPriority = this.taskFilters.priority === 'all' || (tarea.priority || 'medium') === this.taskFilters.priority;
      const haystack = [
        tarea.title,
        tarea.entity_label,
        tarea.assigned?.full_name,
        tarea.assigned?.email
      ].join(' ').toLowerCase();
      const matchesQuery = !query || haystack.includes(query);
      return matchesStatus && matchesEntity && matchesPriority && matchesQuery;
    });
  }

  isTaskOverdue(tarea: any): boolean {
    if (!tarea?.due_at || tarea.status === 'done') return false;
    const deadline = this.parent.taskDueDeadline(tarea.due_at);
    return !!deadline && deadline.getTime() < Date.now();
  }

  taskStatusLabel(tarea: any): string {
    if (this.isTaskOverdue(tarea)) return 'Vencida';
    return this.parent.statusLabel(tarea?.status);
  }

  resetTaskFilters() {
    this.taskFilters = { query: '', status: 'all', entityType: 'all', priority: 'all' };
  }
}
