import { Injectable } from '@angular/core';

import { SupabaseService } from './supabase.service';

export type CompanyPlan = 'lite' | 'empresa' | 'premium';

export type CompanyPlanCapabilities = {
  members: boolean;
  branding: boolean;
  onboarding: boolean;
  careIntakes: boolean;
  vouchers: boolean;
  metrics: boolean;
  trainingHub: boolean;
  events: boolean;
  accountManagement: boolean;
};

const PLAN_CAPABILITIES: Record<CompanyPlan, CompanyPlanCapabilities> = {
  lite: {
    members: true,
    branding: true,
    onboarding: true,
    careIntakes: false,
    vouchers: false,
    metrics: false,
    trainingHub: false,
    events: false,
    accountManagement: false,
  },
  empresa: {
    members: true,
    branding: true,
    onboarding: true,
    careIntakes: true,
    vouchers: true,
    metrics: true,
    trainingHub: true,
    events: false,
    accountManagement: false,
  },
  premium: {
    members: true,
    branding: true,
    onboarding: true,
    careIntakes: true,
    vouchers: true,
    metrics: true,
    trainingHub: true,
    events: true,
    accountManagement: true,
  },
};

const PLAN_FEATURE_LABELS: Record<CompanyPlan, string[]> = {
  lite: ['Co-branding', 'Miembros', 'Onboarding básico'],
  empresa: ['Co-branding', 'Miembros', 'Onboarding', 'Fichas RR.HH.', 'Vouchers', 'Métricas'],
  premium: [
    'Co-branding',
    'Miembros',
    'Onboarding',
    'Fichas RR.HH.',
    'Vouchers',
    'Métricas',
    'Training hub',
    'Eventos',
    'Account management',
  ],
};

@Injectable({ providedIn: 'root' })
export class CompanyPlanService {
  constructor(private readonly supabase: SupabaseService) {}

  public normalizePlan(plan: string | null | undefined): CompanyPlan {
    if (plan === 'empresa' || plan === 'premium') return plan;
    return 'lite';
  }

  public getCapabilities(plan: CompanyPlan): CompanyPlanCapabilities {
    return PLAN_CAPABILITIES[plan];
  }

  public getFeatureLabels(plan: CompanyPlan): string[] {
    return PLAN_FEATURE_LABELS[plan];
  }

  public async getPlanForUser(userId: string): Promise<CompanyPlan | null> {
    const { data: membership, error: membershipError } = await this.supabase.client
      .from('company_members')
      .select('company_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (membershipError) throw membershipError;

    const companyId = (membership?.company_id as string | undefined) ?? null;
    if (!companyId) return null;

    const { data: company, error: companyError } = await this.supabase.client
      .from('companies')
      .select('plan_tier')
      .eq('id', companyId)
      .maybeSingle();

    if (companyError) throw companyError;
    return this.normalizePlan((company?.plan_tier as string | undefined) ?? 'lite');
  }
}
