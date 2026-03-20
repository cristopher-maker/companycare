import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { ServicesPageRoutingModule } from './services-routing.module';
import { ServicesPage } from './services.page';

@NgModule({
  imports: [CommonModule, IonicModule, ServicesPageRoutingModule],
  declarations: [ServicesPage],
})
export class ServicesPageModule {}

