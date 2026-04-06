import { Component, OnDestroy, OnInit } from '@angular/core';

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
  public roiEmployees = 250;
  public readonly roiHoursRecoveredPerEmployee = 6;
  public readonly roiHourlyCostClp = 12000;
  private unsub?: { data: { subscription: { unsubscribe: () => void } } };

  public readonly packagePlans: PackagePlan[] = [
    {
      id: 'lite',
      name: 'Plan Lite',
      badge: 'Entrada',
      summary: 'Portal co‑brandeado con recursos esenciales y onboarding básico.',
      audience: 'Empresas que quieren activar el beneficio rápido.',
      accentClass: 'plans-card--lite',
      features: [
        'Portal co‑brandeado',
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
    {
      label: 'Portal co‑brandeado',
      values: { lite: true, empresa: true, premium: true },
    },
    {
      label: 'Recursos y guías',
      values: { lite: true, empresa: true, premium: true },
    },
    {
      label: 'Onboarding RR.HH.',
      values: { lite: true, empresa: true, premium: true },
    },
    {
      label: 'Fichas de cuidado RR.HH.',
      values: { lite: false, empresa: true, premium: true },
    },
    {
      label: 'Métricas del beneficio',
      values: { lite: false, empresa: true, premium: true },
    },
    {
      label: 'Vouchers y beneficios',
      values: { lite: false, empresa: true, premium: true },
    },
    {
      label: 'Formación para managers',
      values: { lite: false, empresa: true, premium: true },
    },
    {
      label: 'Care Experts ilimitados',
      values: { lite: false, empresa: false, premium: true },
    },
    {
      label: 'Seguimiento de casos',
      values: { lite: false, empresa: false, premium: true },
    },
    {
      label: 'Soporte prioritario',
      values: { lite: false, empresa: false, premium: true },
    },
  ] as const;

  constructor(private readonly supabase: SupabaseService) {}

  public ngOnInit(): void {
    void this.refresh();
    this.unsub = this.supabase.client.auth.onAuthStateChange(() => void this.refresh());
  }

  public ngOnDestroy(): void {
    this.unsub?.data.subscription.unsubscribe();
  }

  public setRoiEmployees(value: number | string | null): void {
    const parsed = typeof value === 'number' ? value : Number(value);
    this.roiEmployees = Number.isFinite(parsed) ? Math.max(50, Math.min(5000, parsed)) : 250;
  }

  public get roiMonthlyHoursRecovered(): number {
    return this.roiEmployees * this.roiHoursRecoveredPerEmployee;
  }

  public get roiMonthlySavingsClp(): number {
    return this.roiMonthlyHoursRecovered * this.roiHourlyCostClp;
  }

  public get roiFormattedSavings(): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(this.roiMonthlySavingsClp);
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
