import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { CareExpertsPageRoutingModule } from './care-experts-routing.module';
import { CareExpertsPage } from './care-experts.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, CareExpertsPageRoutingModule],
  declarations: [CareExpertsPage],
})
export class CareExpertsPageModule {}

