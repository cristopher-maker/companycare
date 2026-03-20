import { Component, OnDestroy, OnInit } from '@angular/core';

import { SupabaseService } from '../../core/services/supabase.service';

type HomeMode = 'public' | 'employee' | 'company';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit, OnDestroy {
  public loading = true;

  public mode: HomeMode = 'public';
  public displayName = 'Usuario';

  public heroTitle = 'Bienvenido a Company Care';
  public heroSubtitle = 'Tu panel central de beneficios y cuidado senior.';
    public heroSlides: Array<{ title: string; description: string; image: string; cta: string }> = [
    {
      title: 'Acompañamiento experto',
      description: 'Conecta con Care Experts y resuelve decisiones de cuidado con apoyo humano.',
      image: 'assets/img/carousel-1.jpeg',
      cta: 'Solicitar asesoría',
    },
    {
      title: 'Red de proveedores',
      description: 'Compara residencias, cuidadores y servicios médicos con datos verificados.',
      image: 'assets/img/carousel-2.jpeg',
      cta: 'Ver proveedores',
    },
    {
      title: 'Recursos y formación',
      description: 'Guías, checklists y módulos para reducir el estrés del cuidado.',
      image: 'assets/img/carousel-3.jpeg',
      cta: 'Explorar recursos',
    },
    {
      title: 'Beneficio corporativo',
      description: 'Métricas, co‑branding y herramientas para RR.HH.',
      image: 'assets/img/carousel-4.jpeg',
      cta: 'Ver panel',
    },
  ];

  public heroBadgeImages: string[] = [
    'assets/img/carousel-1.jpeg',
    'assets/img/carousel-2.jpeg',
    'assets/img/carousel-3.jpeg',
  ];
  public activeSlideIndex = 0;
  public heroBadgeIndex = 0;
  public badgeStartDeg = 0;
  public badgeEndDeg = 0;
  public heroBgUrl = '';
  public aboutBgUrl = '';

  private unsub?: { data: { subscription: { unsubscribe: () => void } } };
  private badgePaused = false;
  private badgeRafId: number | null = null;
  private readonly badgeDurationMs = 6500;
  private carouselTimerId: number | null = null;

  private readonly badgeStorageKey = 'companycare:home:badge:v1';
  private badgeSegmentStartEpochMs = Date.now();
  private badgePausedAtEpochMs: number | null = null;
  private badgePausedMs = 0;
  private badgeLastPersistEpochMs = 0;

  constructor(private readonly supabase: SupabaseService) {
    this.heroBgUrl = this.assetUrl('hero/company-care-hero.jpg');
    this.aboutBgUrl = this.assetUrl('img/about-us.jpg');
    this.heroSlides = this.heroSlides.map((slide) => ({
      ...slide,
      image: this.assetUrl(slide.image.replace(/^assets\//, '')),
    }));
    this.heroBadgeImages = this.heroBadgeImages.map((image) =>
      this.assetUrl(image.replace(/^assets\//, ''))
    );
  }

  public ngOnInit(): void {
    void this.refresh();
    this.unsub = this.supabase.client.auth.onAuthStateChange(() => void this.refresh());
    this.restoreBadgeState();
    this.startBadgeProgress();
    this.startCarousel();
  }

  public ngOnDestroy(): void {
    this.unsub?.data.subscription.unsubscribe();
    this.persistBadgeState(this.getBadgeProgress());
    this.stopBadgeProgress();
    this.stopCarousel();
  }

  public nextSlide(): void {
    if (this.heroSlides.length <= 1) return;
    this.activeSlideIndex = (this.activeSlideIndex + 1) % this.heroSlides.length;
  }

  public prevSlide(): void {
    if (this.heroSlides.length <= 1) return;
    this.activeSlideIndex =
      (this.activeSlideIndex - 1 + this.heroSlides.length) % this.heroSlides.length;
  }

  public setActiveSlide(index: number): void {
    if (this.heroSlides.length <= 1) {
      this.activeSlideIndex = 0;
      return;
    }
    this.activeSlideIndex = Math.max(0, Math.min(this.heroSlides.length - 1, index));
    this.stopCarousel();
    this.startCarousel();
  }

  public pauseCarousel(paused: boolean): void {
    if (paused) {
      this.stopCarousel();
      return;
    }
    this.startCarousel();
  }

  public pauseBadge(paused: boolean): void {
    this.badgePaused = paused;

    if (paused) {
      if (this.badgePausedAtEpochMs === null) this.badgePausedAtEpochMs = Date.now();
      return;
    }

    if (this.badgePausedAtEpochMs !== null) {
      this.badgePausedMs += Date.now() - this.badgePausedAtEpochMs;
      this.badgePausedAtEpochMs = null;
      this.persistBadgeState(this.getBadgeProgress());
    }
  }

  public selectBadge(index: number): void {
    if (index < 0 || index >= this.heroBadgeImages.length) return;
    this.heroBadgeIndex = index;
    this.badgeSegmentStartEpochMs = Date.now();
    this.badgePausedMs = 0;
    if (this.badgePaused) this.badgePausedAtEpochMs = this.badgePausedAtEpochMs ?? Date.now();
    this.resetBadgeProgress();
    this.persistBadgeState(0);
  }

  private resetBadgeProgress(): void {
    const count = Math.max(1, this.heroBadgeImages.length);
    const seg = 360 / count;
    this.badgeStartDeg = this.heroBadgeIndex * seg;
    this.badgeEndDeg = this.badgeStartDeg;
  }

  private updateBadgeProgress(progress: number): void {
    const clamped = Math.max(0, Math.min(1, progress));
    const count = Math.max(1, this.heroBadgeImages.length);
    const seg = 360 / count;
    this.badgeStartDeg = this.heroBadgeIndex * seg;
    this.badgeEndDeg = this.badgeStartDeg + seg * clamped;
  }

  private getBadgeProgress(nowEpochMs: number = Date.now()): number {
    const effectiveNow = this.badgePausedAtEpochMs ?? nowEpochMs;
    const elapsed = Math.max(0, effectiveNow - this.badgeSegmentStartEpochMs - this.badgePausedMs);
    return Math.max(0, Math.min(1, elapsed / this.badgeDurationMs));
  }

  private startBadgeProgress(): void {
    this.stopBadgeProgress();
    if (this.heroBadgeImages.length <= 1) return;

    const tick = () => {
      const now = Date.now();

      if (this.badgePaused) {
        if (this.badgePausedAtEpochMs === null) this.badgePausedAtEpochMs = now;
        this.badgeRafId = window.requestAnimationFrame(tick);
        return;
      }

      if (this.badgePausedAtEpochMs !== null) {
        this.badgePausedMs += now - this.badgePausedAtEpochMs;
        this.badgePausedAtEpochMs = null;
      }

      const progress = this.getBadgeProgress(now);
      this.updateBadgeProgress(progress);

      if (progress >= 1) {
        this.heroBadgeIndex = (this.heroBadgeIndex + 1) % this.heroBadgeImages.length;
        this.badgeSegmentStartEpochMs = now;
        this.badgePausedMs = 0;
        this.updateBadgeProgress(0);
      }

      this.persistBadgeState(this.getBadgeProgress(now));
      this.badgeRafId = window.requestAnimationFrame(tick);
    };

    this.badgeRafId = window.requestAnimationFrame(tick);
  }

  private stopBadgeProgress(): void {
    if (this.badgeRafId === null) return;
    window.cancelAnimationFrame(this.badgeRafId);
    this.badgeRafId = null;
  }

  private startCarousel(): void {
    this.stopCarousel();
    if (this.heroSlides.length <= 1) return;
    this.carouselTimerId = window.setInterval(() => {
      this.nextSlide();
    }, 6000);
  }

  private stopCarousel(): void {
    if (this.carouselTimerId === null) return;
    window.clearInterval(this.carouselTimerId);
    this.carouselTimerId = null;
  }

  private persistBadgeState(progress: number): void {
    const now = Date.now();
    if (now - this.badgeLastPersistEpochMs < 750) return;
    this.badgeLastPersistEpochMs = now;

    try {
      const payload = JSON.stringify({
        index: this.heroBadgeIndex,
        progress: Math.max(0, Math.min(1, progress)),
        savedAt: now,
      });
      window.localStorage.setItem(this.badgeStorageKey, payload);
    } catch {
      // ignore (private mode, storage disabled, etc.)
    }
  }

  private restoreBadgeState(): void {
    try {
      const raw = window.localStorage.getItem(this.badgeStorageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw) as { index?: unknown; progress?: unknown };
      const count = this.heroBadgeImages.length;
      if (count <= 0) return;

      const idx = typeof parsed.index === 'number' ? parsed.index : 0;
      const prog = typeof parsed.progress === 'number' ? parsed.progress : 0;

      this.heroBadgeIndex = Math.max(0, Math.min(count - 1, Math.floor(idx)));
      const clampedProg = Math.max(0, Math.min(1, prog));

      this.badgeSegmentStartEpochMs = Date.now() - clampedProg * this.badgeDurationMs;
      this.badgePausedMs = 0;
      this.badgePausedAtEpochMs = null;
      this.updateBadgeProgress(clampedProg);
    } catch {
      // ignore corrupted state
    }
  }

  private async refresh(): Promise<void> {
    this.loading = true;

    const { data: sessionData } = await this.supabase.client.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      this.mode = 'public';
      this.displayName = 'Usuario';
      this.heroTitle = 'Bienvenido a Company Care';
      this.heroSubtitle = 'Tu panel central de beneficios y cuidado senior.';
      this.loading = false;
      return;
    }

    const { data: profile } = await this.supabase.client
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .maybeSingle();

    const role = (profile?.role ?? 'employee') as string;
    this.displayName = profile?.full_name?.trim() ? profile.full_name : 'Usuario';

    if (role === 'admin' || role === 'company_admin') {
      this.mode = 'company';
      this.heroTitle = `Hola, ${this.displayName}`;
      this.heroSubtitle = 'Panel Empresa: métricas, co-branding y herramientas de RR.HH.';
    } else {
      this.mode = 'employee';
      this.heroTitle = `Hola, ${this.displayName}`;
      this.heroSubtitle = 'Portal de beneficios: expertos, proveedores, recursos y formación.';
    }

    this.loading = false;
  }
  private assetUrl(path: string): string {
    try {
      if (typeof document === 'undefined') {
        return `assets/${path}`;
      }
      const base = document.querySelector('base')?.href || document.baseURI;
      return new URL(`assets/${path}`, base).toString();
    } catch {
      return `assets/${path}`;
    }
  }
}

