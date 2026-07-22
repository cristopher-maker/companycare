import { Component, OnDestroy, OnInit } from '@angular/core';
import { UiService } from '../../core/services/ui.service';
import { SupabaseService } from '../../core/services/supabase.service';

export type VoucherRow = {
  id: string;
  code: string;
  title: string;
  category?: string;
  description: string | null;
  discount_type: string;
  discount_value: number | null;
  currency: string;
  active: boolean;
  expires_at?: string;
};

const DEFAULT_VOUCHERS: VoucherRow[] = [
  {
    id: 'v1',
    code: 'CARE15OFF',
    title: '15% de Descuento en Evaluaciones Domiciliarias',
    category: 'Evaluación de Salud',
    description: 'Válido para la primera sesión de diagnóstico ergonómico y clínico del hogar realizado por nuestros especialistas.',
    discount_type: 'percentage',
    discount_value: 15,
    currency: 'CLP',
    active: true,
    expires_at: '31 Dic 2026'
  },
  {
    id: 'v2',
    code: 'MINDFULCARE',
    title: '1 mes Gratis en Talleres y Webinars de Salud Mental',
    category: 'Bienestar Emocional',
    description: 'Acceso ilimitado a talleres semanales de contención emocional y prevención del agotamiento del cuidador.',
    discount_type: 'percentage',
    discount_value: 100,
    currency: 'CLP',
    active: true,
    expires_at: '30 Nov 2026'
  },
  {
    id: 'v3',
    code: 'MOVILIDAD20',
    title: '20% de Descuento en Equipamiento e Insumos',
    category: 'Insumos Médicos',
    description: 'Válido en la red de proveedores en barras de apoyo, sillas de rueda y accesorios de seguridad.',
    discount_type: 'percentage',
    discount_value: 20,
    currency: 'CLP',
    active: true,
    expires_at: '15 Oct 2026'
  },
  {
    id: 'v4',
    code: 'LEGALCARE',
    title: 'Sesión Gratuita de Asesoría Legal y Social',
    category: 'Trámites y Salud',
    description: 'Orientación de 30 min para postulación a subsidios y tramitación de licencias y garantías GES.',
    discount_type: 'fixed_amount',
    discount_value: 35000,
    currency: 'CLP',
    active: true,
    expires_at: '31 Dic 2026'
  }
];

@Component({
  selector: 'app-vouchers',
  templateUrl: './vouchers.page.html',
  styleUrls: ['./vouchers.page.scss'],
})
export class VouchersPage implements OnInit, OnDestroy {
  public loading = true;
  public error: string | null = null;
  public items: VoucherRow[] = [];
  public copiedCode: string | null = null;

  private unsub?: { data: { subscription: { unsubscribe: () => void } } };

  constructor(
    private readonly supabase: SupabaseService,
    public readonly ui: UiService
  ) {}

  public ngOnInit(): void {
    void this.refresh();
    this.unsub = this.supabase.client.auth.onAuthStateChange(() => void this.refresh());
  }

  public ngOnDestroy(): void {
    this.unsub?.data.subscription.unsubscribe();
  }

  public async refresh(): Promise<void> {
    this.loading = true;
    this.error = null;

    try {
      const { data, error } = await this.supabase.client
        .from('vouchers')
        .select('id, code, title, description, discount_type, discount_value, currency, active')
        .eq('active', true)
        .order('title', { ascending: true });

      if (error) throw error;
      const loaded = (data ?? []) as VoucherRow[];
      this.items = loaded.length > 0 ? loaded : DEFAULT_VOUCHERS;
    } catch {
      this.items = DEFAULT_VOUCHERS;
    } finally {
      this.loading = false;
    }
  }

  public get percentageCount(): number {
    return this.items.filter((item) => item.discount_type === 'percentage').length;
  }

  public get fixedAmountCount(): number {
    return this.items.filter((item) => item.discount_type === 'fixed_amount').length;
  }

  public discountLabel(item: VoucherRow): string {
    if (item.discount_type === 'percentage') {
      return item.discount_value === 100 ? '100% GRATIS' : `${item.discount_value ?? 0}% OFF`;
    }

    const currency = item.currency || 'CLP';
    const amount = new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(item.discount_value ?? 0);

    return `${amount} OFF`;
  }

  public copyCode(code: string): void {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(code);
    }
    this.copiedCode = code;
    setTimeout(() => {
      if (this.copiedCode === code) this.copiedCode = null;
    }, 3000);
  }
}
