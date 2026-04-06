import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { PackagesPageRoutingModule } from './packages-routing.module';
import { PackagesPage } from './packages.page';

@NgModule({
  imports: [CommonModule, IonicModule, PackagesPageRoutingModule],
  declarations: [PackagesPage],
})
export class PackagesPageModule {}
