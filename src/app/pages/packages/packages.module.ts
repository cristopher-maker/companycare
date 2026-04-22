import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { PackagesPageRoutingModule } from './packages-routing.module';
import { PackagesPage } from './packages.page';
import { FooterComponent } from '../contact/footer.component';

@NgModule({
  imports: [CommonModule, IonicModule, PackagesPageRoutingModule, FooterComponent],
  declarations: [PackagesPage],
})
export class PackagesPageModule {}
