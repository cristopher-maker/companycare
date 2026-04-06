import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MenuController } from '@ionic/angular';

import { AuthService, ProfileRole } from './core/services/auth.service';

type AppPage = { title: string; url: string; icon: string; queryParams?: Record<string, string> };

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  public readonly appTitle = 'Company Care by Senior Advisor';
  public profileRole: ProfileRole | null = null;

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
    { title: 'Perfil', url: '/profile', icon: 'person-circle' },
    { title: 'Contacto', url: '/contact', icon: 'mail' },
    { title: 'Nosotros', url: '/about', icon: 'information-circle' },
    { title: 'Servicios (demo)', url: '/services', icon: 'briefcase' },
  ];

  public readonly careExpertPages: AppPage[] = [
    { title: 'Inicio', url: '/home', icon: 'home' },
    { title: 'Inbox de casos', url: '/care-experts', icon: 'chatbubbles' },
    { title: 'Formación', url: '/training', icon: 'school' },
    { title: 'Recursos digitales', url: '/resources', icon: 'library' },
    { title: 'Perfil', url: '/profile', icon: 'person-circle' },
    { title: 'Contacto', url: '/contact', icon: 'mail' },
  ];

  constructor(
    public readonly auth: AuthService,
    private readonly menu: MenuController,
    private readonly router: Router
  ) {
    this.auth.session$.subscribe(() => void this.refreshRole());
  }

  public get visiblePages(): AppPage[] {
    const isCompany = this.profileRole === 'company_admin' || this.profileRole === 'manager';
    const isCareExpert = this.profileRole === 'care_expert';
    const isEmployeeLike = this.profileRole === 'employee' || this.profileRole === 'admin';

    if (isCompany) {
      return this.appPages.filter((page) => page.url !== '/care-experts' && page.url !== '/requests');
    }

    if (isCareExpert) {
      return this.careExpertPages;
    }

    if (isEmployeeLike) {
      return this.appPages.filter((page) => page.url !== '/company');
    }

    return this.appPages;
  }

  public async closeMenu(): Promise<void> {
    await this.menu.close();
  }

  public async authAction(): Promise<void> {
    if (this.auth.user) {
      await this.auth.signOut();
      this.profileRole = null;
      await this.router.navigateByUrl('/home');
      return;
    }

    await this.router.navigateByUrl('/login');
  }

  private async refreshRole(): Promise<void> {
    if (!this.auth.user) {
      this.profileRole = null;
      return;
    }

    try {
      this.profileRole = await this.auth.getCurrentProfileRole();
    } catch {
      this.profileRole = null;
    }
  }
}
