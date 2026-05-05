import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { PackagesPageRoutingModule } from './packages-routing.module';
import { PackagesPage } from './packages.page';
import { SiteFooterComponent } from '../../shared/components/site-footer/site-footer.component';
import { SiteHeaderComponent } from '../../shared/components/site-header/site-header.component';

@NgModule({
  imports: [CommonModule, FormsModule, PackagesPageRoutingModule, SiteHeaderComponent, SiteFooterComponent],
  declarations: [PackagesPage],
})
export class PackagesPageModule {}
