import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ResourcesPageRoutingModule } from './resources-routing.module';
import { ResourcesPage } from './resources.page';
import { SiteFooterComponent } from '../../shared/components/site-footer/site-footer.component';
import { SiteHeaderComponent } from '../../shared/components/site-header/site-header.component';

@NgModule({
  imports: [CommonModule, ResourcesPageRoutingModule, SiteHeaderComponent, SiteFooterComponent],
  declarations: [ResourcesPage],
})
export class ResourcesPageModule {}
