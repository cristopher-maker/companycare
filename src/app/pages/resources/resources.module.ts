import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { ResourcesPageRoutingModule } from './resources-routing.module';
import { ResourcesPage } from './resources.page';

@NgModule({
  imports: [CommonModule, IonicModule, ResourcesPageRoutingModule],
  declarations: [ResourcesPage],
})
export class ResourcesPageModule {}

