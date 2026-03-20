import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { RequestsPageRoutingModule } from './requests-routing.module';
import { RequestsPage } from './requests.page';

@NgModule({
  imports: [CommonModule, IonicModule, RequestsPageRoutingModule],
  declarations: [RequestsPage],
})
export class RequestsPageModule {}

