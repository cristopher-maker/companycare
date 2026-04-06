import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { CompanyRequestsPageRoutingModule } from './company-requests-routing.module';
import { CompanyRequestsPage } from './company-requests.page';

@NgModule({
  imports: [CommonModule, IonicModule, CompanyRequestsPageRoutingModule],
  declarations: [CompanyRequestsPage],
})
export class CompanyRequestsPageModule {}
