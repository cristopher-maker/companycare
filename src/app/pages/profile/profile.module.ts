import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

import { ProfilePageRoutingModule } from './profile-routing.module';
import { ProfilePage } from './profile.page';
import { SiteHeaderComponent } from '../../shared/components/site-header/site-header.component';

@NgModule({
  imports: [CommonModule, FormsModule, MatIconModule, SiteHeaderComponent, ProfilePageRoutingModule],
  declarations: [ProfilePage],
})
export class ProfilePageModule {}
