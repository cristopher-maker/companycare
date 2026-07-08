import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

import { ResourcesPageRoutingModule } from './resources-routing.module';
import { ResourcesPage } from './resources.page';
import { TrustUrlPipe } from './trust-url.pipe';
import { SiteFooterComponent } from '../../shared/components/site-footer/site-footer.component';
import { SiteHeaderComponent } from '../../shared/components/site-header/site-header.component';

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatIconModule,
    ResourcesPageRoutingModule,
    SiteHeaderComponent,
    SiteFooterComponent
  ],
  declarations: [ResourcesPage, TrustUrlPipe],
})
export class ResourcesPageModule {}
