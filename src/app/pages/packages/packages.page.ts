import { Component } from '@angular/core';

@Component({
  selector: 'app-packages',
  templateUrl: './packages.page.html',
  styleUrls: ['./packages.page.scss'],
})
export class PackagesPage {
  employees: number = 500;

  get impacted(): number {
    return Math.round(this.employees * 0.2);
  }

  get savings(): number {
    // Pérdida referencial en productividad
    return this.impacted * 1.5 * 8 * 10000;
  }

  get hours(): number {
    return this.impacted * 8;
  }

  updateRoi(value: any) {
    const parsed = Number(value);
    if (!isNaN(parsed)) {
      this.employees = Math.min(5000, Math.max(10, parsed));
    }
  }

  fmt(n: number): string {
    return Math.round(n).toLocaleString('es-CL');
  }

  fmtClp(n: number): string {
    return '$ ' + Math.round(n).toLocaleString('es-CL');
  }
}