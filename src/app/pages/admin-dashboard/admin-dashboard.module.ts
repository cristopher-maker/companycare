import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';

import { AdminDashboardRoutingModule } from './admin-dashboard-routing.module';
import { AdminDashboardComponent } from './admin-dashboard.component';

@NgModule({
  declarations: [
    AdminDashboardComponent
  ],
  imports: [
    CommonModule,
    MatIconModule,
    FormsModule,
    RouterModule,
    DragDropModule,
    BaseChartDirective
  ],
  providers: [
    provideCharts(withDefaultRegisterables())
  ],
  exports: [
    AdminDashboardComponent
  ]
})
export class AdminDashboardModule { }
