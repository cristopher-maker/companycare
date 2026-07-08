import { Component } from '@angular/core';
import { AdminDashboardComponent } from '../admin-dashboard.component';

@Component({
  selector: 'app-sedes',
  templateUrl: './sedes.component.html'
})
export class SedesComponent {
  constructor(public parent: AdminDashboardComponent) {}

  sedeTypeLabel(type: string): string {
    switch (type) {
      case 'residencia': return 'Residencia';
      case 'daycare': return 'Centro de Día';
      case 'clinic': return 'Clínica';
      default: return type || 'Otro';
    }
  }

  sedeStatusLabel(status: string): string {
    switch (status) {
      case 'activa': return 'Activa';
      case 'mantencion': return 'Mantenimiento';
      case 'inactiva': return 'Inactiva';
      default: return status || 'Activa';
    }
  }
}
