import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

import { DashboardPageRoutingModule } from './dashboard-routing.module';
import { DashboardPage } from './dashboard.page';

@NgModule({
  imports: [CommonModule, FormsModule, DashboardPageRoutingModule, MatIconModule],
  declarations: [DashboardPage],
})
export class DashboardPageModule {}
