import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { TrainingAdminPageRoutingModule } from './training-admin-routing.module';
import { TrainingAdminPage } from './training-admin.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, TrainingAdminPageRoutingModule],
  declarations: [TrainingAdminPage],
})
export class TrainingAdminPageModule {}

