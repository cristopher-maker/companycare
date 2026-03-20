import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MenuController } from '@ionic/angular';

import { AuthService } from './core/services/auth.service';

type AppPage = { title: string; url: string; icon: string };

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  public readonly appTitle = 'Company Care by Senior Advisor';
  public readonly appPages: AppPage[] = [
    { title: 'Inicio', url: '/home', icon: 'home' },
    { title: 'Dashboard', url: '/dashboard', icon: 'grid' },
    { title: 'Asesoría personalizada', url: '/care-experts', icon: 'chatbubbles' },
    { title: 'Proveedores verificados', url: '/providers', icon: 'search' },
    { title: 'Recursos digitales', url: '/resources', icon: 'library' },
    { title: 'Formación', url: '/training', icon: 'school' },
    { title: 'Mis solicitudes', url: '/requests', icon: 'reader' },
    { title: 'Vouchers', url: '/vouchers', icon: 'pricetag' },
    { title: 'Administrar empresa', url: '/company', icon: 'business' },
    { title: 'Contacto', url: '/contact', icon: 'mail' },
    { title: 'Nosotros', url: '/about', icon: 'information-circle' },
    { title: 'Servicios (demo)', url: '/services', icon: 'briefcase' },
  ];

  constructor(
    public readonly auth: AuthService,
    private readonly menu: MenuController,
    private readonly router: Router
  ) {}

  public async closeMenu(): Promise<void> {
    await this.menu.close();
  }

  public async authAction(): Promise<void> {
    if (this.auth.user) {
      await this.auth.signOut();
      await this.router.navigateByUrl('/home');
      return;
    }

    await this.router.navigateByUrl('/login');
  }
}

