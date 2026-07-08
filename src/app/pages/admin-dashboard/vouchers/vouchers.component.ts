import { Component } from '@angular/core';
import { AdminDashboardComponent } from '../admin-dashboard.component';

@Component({
  selector: 'app-vouchers',
  template: `
    <div class="mt-8">
      <div class="view-header">
        <span class="view-title">Vouchers de descuento</span>
      </div>
      <div class="table-card" style="padding: 2.5rem; text-align: center; color: var(--text2);">
        <mat-icon style="font-size: 48px; width: 48px; height: 48px; color: var(--text3); margin-bottom: 1rem;">local_activity</mat-icon>
        <h3>Gestión por Empresa</h3>
        <p style="margin-top: 0.5rem; color: var(--text3);">Los vouchers de beneficios corporativos se administran directamente desde el portal de cada empresa cliente en la sección respectiva.</p>
      </div>
    </div>
  `
})
export class VouchersComponent {
  constructor(public parent: AdminDashboardComponent) {}
}
