import { Component } from '@angular/core';
import { AdminDashboardComponent } from '../admin-dashboard.component';

@Component({
  selector: 'app-gastos',
  templateUrl: './gastos.component.html'
})
export class GastosComponent {
  constructor(public parent: AdminDashboardComponent) {}
}
