import { Component } from '@angular/core';
import { AdminDashboardComponent } from '../admin-dashboard.component';

@Component({
  selector: 'app-kardex',
  templateUrl: './kardex.component.html'
})
export class KardexComponent {
  constructor(public parent: AdminDashboardComponent) {}
}
