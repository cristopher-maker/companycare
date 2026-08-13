import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';

import { CompanyRequestsPageRoutingModule } from './company-requests-routing.module';
import { CompanyRequestsPage } from './company-requests.page';
import { SiteHeaderComponent } from '../../shared/components/site-header/site-header.component';

@NgModule({
  imports: [CommonModule, MatIconModule, FormsModule, CompanyRequestsPageRoutingModule, SiteHeaderComponent],
  declarations: [CompanyRequestsPage],
})
export class CompanyRequestsPageModule {}
