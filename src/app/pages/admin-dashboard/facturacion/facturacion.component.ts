import { Component } from '@angular/core';
import { AdminDashboardComponent } from '../admin-dashboard.component';

@Component({
  selector: 'app-facturacion',
  templateUrl: './facturacion.component.html'
})
export class FacturacionComponent {
  constructor(public parent: AdminDashboardComponent) {}
}
