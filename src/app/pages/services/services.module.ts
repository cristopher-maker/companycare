import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ServicesPageRoutingModule } from './services-routing.module';
import { ServicesPage } from './services.page';
import { SiteFooterComponent } from '../../shared/components/site-footer/site-footer.component';
import { SiteHeaderComponent } from '../../shared/components/site-header/site-header.component';

@NgModule({
  imports: [CommonModule, ServicesPageRoutingModule, ServicesPage, SiteHeaderComponent, SiteFooterComponent],
})
export class ServicesPageModule {}
