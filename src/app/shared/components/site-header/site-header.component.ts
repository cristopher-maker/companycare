// Reemplaza el contenido de: src/app/shared/components/site-header/site-header.component.ts
import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { filter } from 'rxjs/operators';

import { AuthService } from '../../../core/services/auth.service';
import { UiService } from '../../../core/services/ui.service';

@Component({
  selector: 'app-site-header',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './site-header.component.html',
  // Si tienes un archivo de estilos, mantenlo. Si no, puedes quitar la siguiente línea.
  styleUrls: ['./site-header.component.scss'] 
})
export class SiteHeaderComponent implements OnInit {
  isScrolled = false;
  isTransparentPage = false;
  isLightPage = false;

  constructor(
    public readonly auth: AuthService,
    public readonly ui: UiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.checkIfTransparent(this.router.url);

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.checkIfTransparent(event.urlAfterRedirects);
    });
  }

  private checkIfTransparent(url: string) {
    // Solo es transparente sobre el hero del Home. En las demás páginas tiene fondo visible.
    const cleanUrl = url ? url.split('?')[0].split('#')[0] : '';
    this.isTransparentPage = cleanUrl.endsWith('/home') || cleanUrl === '/' || cleanUrl === '';
    const isDarkNavPage = cleanUrl.includes('/resources');
    this.isLightPage = !this.isTransparentPage && !isDarkNavPage;
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.scrollY > 50;
  }
}
