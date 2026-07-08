import { Component } from '@angular/core';
import { AdminDashboardComponent } from '../admin-dashboard.component';

@Component({
  selector: 'app-metricas',
  templateUrl: './metricas.component.html'
})
export class MetricasComponent {
  constructor(public parent: AdminDashboardComponent) {}
}
