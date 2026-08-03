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
    const cleanUrl = url ? url.split('?')[0].split('#')[0] : '';
    // Páginas con fondo Hero oscuro que llevan Navbar Transparente con texto e icono blanco antes del scroll:
    const isDarkHeroPage = cleanUrl.endsWith('/home') || cleanUrl === '/' || cleanUrl === '' || cleanUrl.includes('/packages');
    this.isTransparentPage = isDarkHeroPage && !this.isScrolled;
    this.isLightPage = false;
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.scrollY > 50;
    this.checkIfTransparent(this.router.url);
  }
}
