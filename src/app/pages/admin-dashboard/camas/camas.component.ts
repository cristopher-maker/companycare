import { Component } from '@angular/core';
import { AdminDashboardComponent } from '../admin-dashboard.component';

@Component({
  selector: 'app-camas',
  templateUrl: './camas.component.html'
})
export class CamasComponent {
  constructor(public parent: AdminDashboardComponent) {}
}
