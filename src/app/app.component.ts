import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AuthService, ProfileRole } from './core/services/auth.service';
import { SupabaseService } from './core/services/supabase.service';
import { UiService } from './core/services/ui.service';

type AppPage = { title: string; url: string; icon: string; queryParams?: Record<string, string> };

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
  public readonly appTitle = 'Company Care by Senior Advisor';
  public isMenuOpen = false;
  public profileRole: ProfileRole | null = null;
  public hasBenefitAccess = false;

  private readonly primaryPageUrls = new Set([
    '/home',
    '/dashboard',
    '/care-experts',
    '/providers',
    '/resources',
    '/requests',
    '/vouchers',
    '/company',
    '/company-requests',
  ]);

  private menuSub: Subscription;

  public readonly appPages: AppPage[] = [
    { title: 'Inicio', url: '/home', icon: 'home' },
    { title: 'Panel de control', url: '/dashboard', icon: 'dashboard' },
    { title: 'Asesoria personalizada', url: '/care-experts', icon: 'forum' },
    { title: 'Proveedores verificados', url: '/providers', icon: 'search' },
    { title: 'Recursos digitales', url: '/resources', icon: 'library_books' },
    { title: 'Mis solicitudes', url: '/requests', icon: 'content_paste' },
    { title: 'Vouchers', url: '/vouchers', icon: 'local_activity' },
    { title: 'Administrar empresa', url: '/company', icon: 'business' },
    { title: 'Monitoreo de casos', url: '/company-requests', icon: 'health_and_safety' },
    { title: 'Perfil', url: '/profile', icon: 'account_circle' },
    { title: 'Contacto', url: '/contact', icon: 'mail_outline' },
    { title: 'Nosotros', url: '/about', icon: 'info_outline' },
    { title: 'Servicios (demo)', url: '/services', icon: 'business_center' },
  ];

  public readonly careExpertPages: AppPage[] = [
    { title: 'Inicio', url: '/home', icon: 'home' },
    { title: 'Inbox de casos', url: '/care-experts', icon: 'forum' },
    { title: 'Recursos digitales', url: '/resources', icon: 'library_books' },
    { title: 'Perfil', url: '/profile', icon: 'account_circle' },
    { title: 'Contacto', url: '/contact', icon: 'mail_outline' },
  ];

  constructor(
    public readonly auth: AuthService,
    private readonly supabase: SupabaseService,
    private readonly router: Router,
    public readonly ui: UiService
  ) {
    this.auth.session$.subscribe(() => void this.handleSessionChange());
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.ui.closeMenu();
      }
    });
    this.menuSub = this.ui.menuOpen$.subscribe((isOpen) => (this.isMenuOpen = isOpen));
  }

  public ngOnInit(): void {
    void this.refreshRole();
  }

  public ngOnDestroy(): void {
    this.menuSub.unsubscribe();
  }

  public get visiblePages(): AppPage[] {
    const isSuperAdmin = this.profileRole === 'admin';
    const isCompany = this.profileRole === 'company_admin' || this.profileRole === 'hr_admin' || this.profileRole === 'manager';
    const isCareExpert = this.profileRole === 'care_expert';
    const isEmployee = this.profileRole === 'employee';

    if (isSuperAdmin) {
      return this.appPages;
    }

    if (isCompany) {
      return this.appPages.filter(
        (page) => page.url !== '/care-experts' && page.url !== '/requests'
      );
    }

    if (isCareExpert) {
      return this.careExpertPages;
    }

    if (isEmployee) {
      const lockedWithoutPlan = new Set(['/care-experts', '/requests', '/providers', '/resources', '/vouchers']);
      return this.appPages.filter((page) => page.url !== '/company' && page.url !== '/company-requests' && (this.hasBenefitAccess || !lockedWithoutPlan.has(page.url)));
    }

    // Default for logged in users whose role is not yet employee/company/etc or during transition
    if (this.auth.user) {
      return this.appPages.filter((page) => (this.hasBenefitAccess || page.url !== '/company' && page.url !== '/company-requests'));
    }

    // For public (not logged in) users, show only public pages.
    const publicUrls = new Set([
      '/home',
      '/services',
      '/about',
      '/contact',
    ]);
    return this.appPages.filter((page) => publicUrls.has(page.url));
  }

  public get primaryPages(): AppPage[] {
    return this.visiblePages.filter((page) => this.primaryPageUrls.has(page.url));
  }

  public get secondaryPages(): AppPage[] {
    return this.visiblePages.filter((page) => !this.primaryPageUrls.has(page.url));
  }

  public closeMenu(): void {
    this.ui.closeMenu();
  }

  public async authAction(): Promise<void> {
    if (this.auth.user) {
      await this.auth.signOut();
      this.profileRole = null;
      this.hasBenefitAccess = false;
      await this.router.navigateByUrl('/home');
      return;
    }

    await this.router.navigateByUrl('/login');
  }

  private async refreshRole(): Promise<void> {
    if (!this.auth.user) {
      this.profileRole = null;
      this.hasBenefitAccess = false;
      return;
    }

    try {
      this.profileRole = await this.auth.getCurrentProfileRole();
      this.hasBenefitAccess = await this.loadBenefitAccess();
    } catch {
      this.profileRole = null;
      this.hasBenefitAccess = false;
    }
  }

  private async handleSessionChange(): Promise<void> {
    if (this.auth.user) {
      try {
        await this.auth.completePendingRegistrationIfAny();
      } catch {
        // Keep navigation usable; the user can retry by signing in again.
      }
    }

    await this.refreshRole();
  }

  private async loadBenefitAccess(): Promise<boolean> {
    if (!this.auth.user) return false;
    if (this.profileRole === 'admin' || this.profileRole === 'care_expert') return true;

    const { data: membership, error: membershipError } = await this.supabase.client
      .from('company_members')
      .select('company_id')
      .eq('user_id', this.auth.user.id)
      .maybeSingle();

    if (membershipError || !membership?.company_id) return false;

    const { data, error } = await this.supabase.client.rpc('can_company_use_benefits', {
      target_company_id: membership.company_id,
    });

    if (error) return false;
    return data === true;
  }
}
