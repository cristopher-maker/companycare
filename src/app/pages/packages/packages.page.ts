﻿import { Component, OnDestroy, OnInit } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';

type PackagePlan = {
  id: 'lite' | 'empresa' | 'premium';
  name: string;
  badge: string;
  summary: string;
  audience: string;
  accentClass: string;
  features: string[];
};
type PackagesMode = 'public' | 'employee' | 'company';

@Component({
  selector: 'app-packages',
  templateUrl: './packages.page.html',
  styleUrls: ['./packages.page.scss'],
})
export class PackagesPage implements OnInit, OnDestroy {
  public mode: PackagesMode = 'public';
  public canStartCareFlow = false;
  
  // Variables Calculadora ROI Chile
  public roiEmployees = 250;
  private readonly porcentajeCuidadores = 0.15; // 15% de la dotación (Datos ENDIDE/CASEN)
  private readonly horasPerdidasAlAno = 48; // 6 días hábiles en trámites/presentismo
  private readonly costoHoraPromedio = 12000; // CLP referencial
  private readonly impactoCompanyCare = 0.50; // Asumimos recuperar el 50% de las horas perdidas

  private unsub?: { data: { subscription: { unsubscribe: () => void } } };

  public readonly packagePlans: PackagePlan[] = [
    {
      id: 'lite',
      name: 'Plan Lite',
      badge: 'Entrada',
      summary: 'Portal co-brandeado con recursos esenciales y onboarding básico.',
      audience: 'Empresas que quieren activar el beneficio rápido.',
      accentClass: 'plans-card--lite',
      features: [
        'Portal co-brandeado',
        'Biblioteca de recursos',
        'Onboarding básico',
        'Soporte limitado',
      ],
    },
    {
      id: 'empresa',
      name: 'Plan Empresa',
      badge: 'Recomendado',
      summary: 'Capa operativa para RR.HH. con seguimiento y gestión de beneficio.',
      audience: 'Equipos que necesitan control, adopción y reporting.',
      accentClass: 'plans-card--empresa',
      features: [
        'Todo lo del Plan Lite',
        'Fichas de cuidado RR.HH.',
        'Métricas del portal',
        'Vouchers corporativos',
        'Formación para managers',
      ],
    },
    {
      id: 'premium',
      name: 'Plan Premium',
      badge: 'Escala',
      summary: 'Cobertura completa con atención experta y acompañamiento continuo.',
      audience: 'Empresas que quieren una solución de alta intervención.',
      accentClass: 'plans-card--premium',
      features: [
        'Todo lo del Plan Empresa',
        'Care Experts ilimitados',
        'Seguimiento de casos',
        'Eventos y webinars',
        'Soporte prioritario',
      ],
    },
  ];

  public readonly planComparisonRows = [
    { label: 'Portal co-brandeado', values: { lite: true, empresa: true, premium: true } },
    { label: 'Recursos y guías', values: { lite: true, empresa: true, premium: true } },
    { label: 'Onboarding RR.HH.', values: { lite: true, empresa: true, premium: true } },
    { label: 'Fichas de cuidado RR.HH.', values: { lite: false, empresa: true, premium: true } },
    { label: 'Métricas del beneficio', values: { lite: false, empresa: true, premium: true } },
    { label: 'Vouchers y beneficios', values: { lite: false, empresa: true, premium: true } },
    { label: 'Formación para managers', values: { lite: false, empresa: true, premium: true } },
    { label: 'Care Experts ilimitados', values: { lite: false, empresa: false, premium: true } },
    { label: 'Seguimiento de casos', values: { lite: false, empresa: false, premium: true } },
    { label: 'Soporte prioritario', values: { lite: false, empresa: false, premium: true } },
  ] as const;

  constructor(private readonly supabase: SupabaseService) {}

  public ngOnInit(): void {
    void this.refresh();
    this.unsub = this.supabase.client.auth.onAuthStateChange(() => void this.refresh());
  }

  public ngOnDestroy(): void {
    this.unsub?.data.subscription.unsubscribe();
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
}
