import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

import { AboutPageRoutingModule } from './about-routing.module';
import { AboutPage } from './about.page';
import { SiteFooterComponent } from '../../shared/components/site-footer/site-footer.component';
import { SiteHeaderComponent } from '../../shared/components/site-header/site-header.component';

@NgModule({
  imports: [
    CommonModule, 
    AboutPageRoutingModule, 
    SiteHeaderComponent, 
    SiteFooterComponent,
    MatIconModule
  ],
  declarations: [AboutPage],
})
export class AboutPageModule {}
