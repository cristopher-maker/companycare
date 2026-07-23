import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatIconModule } from '@angular/material/icon';

import { ContactPageRoutingModule } from './contact-routing.module';
import { ContactPage } from './contact.page';

// Si también usas el site-header aquí, asegúrate de importarlo
import { SiteHeaderComponent } from '../../shared/components/site-header/site-header.component';
import { SiteFooterComponent } from '../../shared/components/site-footer/site-footer.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    ContactPageRoutingModule,
    SiteHeaderComponent,
    SiteFooterComponent 
  ],
  declarations: [ContactPage]
})
export class ContactPageModule {}
