import { Component } from '@angular/core';
import { AdminDashboardComponent } from '../admin-dashboard.component';

@Component({
  selector: 'app-config',
  templateUrl: './config.component.html'
})
export class ConfigComponent {
  constructor(public parent: AdminDashboardComponent) {}
}
