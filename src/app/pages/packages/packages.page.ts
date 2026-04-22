﻿﻿﻿import { Component, ElementRef, OnDestroy, OnInit, ViewChild, AfterViewInit, Renderer2 } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';

type PackagePlan = {
  id: 'plataforma' | 'acompanamiento';
  name: string;
  badge: string;
  summary: string;
  audience: string;
  accentClass: string;
  features: string[];
  price: string;
  period: string;
};
type PackagesMode = 'public' | 'employee' | 'company';

@Component({
  selector: 'app-packages',
  templateUrl: './packages.page.html',
  styleUrls: ['./packages.page.scss'],
})
export class PackagesPage implements OnInit, OnDestroy, AfterViewInit {
  public mode: PackagesMode = 'public';
  public canStartCareFlow = false;
  
  // Variables Calculadora ROI Chile
  public roiEmployees = 250;
  private readonly porcentajeCuidadores = 0.15; // 15% de la dotación (Datos ENDIDE/CASEN)
  private readonly horasPerdidasAlAno = 48; // 6 días hábiles en trámites/presentismo
  private readonly costoHoraPromedio = 12000; // CLP referencial
  private readonly impactoCompanyCare = 0.50; // Asumimos recuperar el 50% de las horas perdidas

  private unsub?: { data: { subscription: { unsubscribe: () => void } } };

  @ViewChild('lavaCanvas') private lavaCanvasRef?: ElementRef<HTMLCanvasElement>;
  private animationId: number | null = null;

  public readonly packagePlans: PackagePlan[] = [
    {
      id: 'plataforma',
      name: 'Plan Plataforma',
      badge: 'Base',
      summary: 'Portal co-brandeado con activación rápida, recursos y una capa inicial de soporte para RR.HH.',
      audience: 'Empresas que quieren partir con una solución liviana y escalable.',
      accentClass: 'plans-card--plataforma',
      features: [
        'Portal co-brandeado',
        'Biblioteca de recursos',
        'Onboarding RR.HH.',
        'Acceso acotado a Care Experts',
        'Métricas base del beneficio',
      ],
      price: '99',
      period: '/mes',
    },
    {
      id: 'acompanamiento',
      name: 'Plan Acompañamiento',
      badge: 'Más vendido',
      summary: 'Cobertura completa con Care Experts, seguimiento de casos y soporte prioritario.',
      audience: 'Empresas que quieren resolver casos reales y sostener la adopción.',
      accentClass: 'plans-card--acompanamiento',
      features: [
        'Todo lo de Plan Plataforma',
        'Fichas de cuidado y derivación',
        'Vouchers corporativos',
        'Care Experts ilimitados',
        'Seguimiento de casos',
        'Formación extendida para managers',
        'Eventos y webinars',
        'Soporte prioritario',
      ],
      price: '249',
      period: '/mes',
    },
  ];

  public readonly planComparisonRows = [
    { label: 'Portal co-brandeado', values: { plataforma: true, acompanamiento: true } },
    { label: 'Recursos y guías', values: { plataforma: true, acompanamiento: true } },
    { label: 'Onboarding RR.HH.', values: { plataforma: true, acompanamiento: true } },
    { label: 'Fichas de cuidado RR.HH.', values: { plataforma: false, acompanamiento: true } },
    { label: 'Métricas del beneficio', values: { plataforma: true, acompanamiento: true } },
    { label: 'Formación para managers', values: { plataforma: false, acompanamiento: true } },
    { label: 'Vouchers y beneficios', values: { plataforma: false, acompanamiento: true } },
    { label: 'Acceso completo a Care Experts', values: { plataforma: false, acompanamiento: true } },
    { label: 'Seguimiento de casos', values: { plataforma: false, acompanamiento: true } },
    { label: 'Soporte prioritario', values: { plataforma: false, acompanamiento: true } },
  ] as const;

  constructor(private readonly supabase: SupabaseService, private readonly renderer: Renderer2) {}

  public ngOnInit(): void {
    this.renderer.addClass(document.body, 'dark-page-active');
    void this.refresh();
    this.unsub = this.supabase.client.auth.onAuthStateChange(() => void this.refresh());
  }

  public ngOnDestroy(): void {
    this.renderer.removeClass(document.body, 'dark-page-active');
    this.unsub?.data.subscription.unsubscribe();
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }

  public ngAfterViewInit(): void {
    this.initLava();
  }

  // --- Lógica del ROI ---
  public setRoiEmployees(value: number | string | null): void {
    const parsed = typeof value === 'number' ? value : Number(value);
    this.roiEmployees = Number.isFinite(parsed) ? Math.max(50, Math.min(5000, parsed)) : 250;
  }

  // Calcula las horas que se recuperan AL MES
  public get roiMonthlyHoursRecovered(): number {
    const cuidadores = this.roiEmployees * this.porcentajeCuidadores;
    const horasRecuperadasAlAno = cuidadores * this.horasPerdidasAlAno * this.impactoCompanyCare;
    return horasRecuperadasAlAno / 12;
  }

  public get roiImpactedEmployees(): number {
    return Math.round(this.roiEmployees * this.porcentajeCuidadores);
  }

  public get roiAnnualCost(): number {
    return this.roiImpactedEmployees * this.horasPerdidasAlAno * this.costoHoraPromedio;
  }

  public get roiFormattedAnnualCost(): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(this.roiAnnualCost);
  }

  public get roiFormattedCostPerCaregiver(): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(this.horasPerdidasAlAno * this.costoHoraPromedio);
  }

  public get roiCaregiverRateLabel(): string {
    return `${Math.round(this.porcentajeCuidadores * 100)}%`;
  }

  public get roiRecoveryLabel(): string {
    return `${Math.round(this.impactoCompanyCare * 100)}%`;
  }

  // Calcula el ahorro total de la empresa AL MES
  public get roiFormattedSavings(): string {
    const cuidadores = this.roiEmployees * this.porcentajeCuidadores;
    const costoOcultoAnual = cuidadores * this.horasPerdidasAlAno * this.costoHoraPromedio;
    const ahorroAnual = costoOcultoAnual * this.impactoCompanyCare;
    const ahorroMensual = ahorroAnual / 12; // Calculamos el mensual para ser más atractivos

    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(ahorroMensual);
  }

  private async refresh(): Promise<void> {
    const { data: sessionData } = await this.supabase.client.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      this.mode = 'public';
      this.canStartCareFlow = false;
      return;
    }

    const { data: profile } = await this.supabase.client
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const role = (profile?.role ?? 'employee') as string;

    if (role === 'admin' || role === 'company_admin' || role === 'manager') {
      this.mode = 'company';
      this.canStartCareFlow = role === 'admin';
      return;
    }

    this.mode = 'employee';
    this.canStartCareFlow = true;
  }

  private initLava() {
    const canvas = this.lavaCanvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const blobs = Array.from({ length: 9 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 80 + Math.random() * 120,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.5,
      hue: Math.random() < 0.5 ? 280 + Math.random() * 30 : 310 + Math.random() * 30,
      phase: Math.random() * Math.PI * 2,
      speed: 0.003 + Math.random() * 0.004
    }));

    const draw = () => {
      // Dibuja un gradiente sutil en lugar de un color sólido
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#1a0a2e'); // Púrpura oscuro (arriba)
      gradient.addColorStop(1, '#3c103f'); // Magenta oscuro (abajo)
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      blobs.forEach(b => {
        b.phase += b.speed;
        b.x += b.vx + Math.sin(b.phase * 0.7) * 0.3;
        b.y += b.vy + Math.cos(b.phase * 0.5) * 0.4;

        if (b.x < -b.r) b.x = canvas.width + b.r;
        if (b.x > canvas.width + b.r) b.x = -b.r;
        if (b.y < -b.r) b.y = canvas.height + b.r;
        if (b.y > canvas.height + b.r) b.y = -b.r;

        const pulse = 1 + 0.18 * Math.sin(b.phase * 1.3);
        const gr = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * pulse);
        gr.addColorStop(0, `hsla(${b.hue}, 100%, 65%, 0.55)`);
        gr.addColorStop(0.5, `hsla(${b.hue + 15}, 90%, 55%, 0.25)`);
        gr.addColorStop(1, `hsla(${b.hue + 30}, 80%, 45%, 0)`);

        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * pulse, 0, Math.PI * 2);
        ctx.fillStyle = gr;
        ctx.fill();
      });
      this.animationId = requestAnimationFrame(draw);
    };
    draw();
  }
}
