import { Component, OnDestroy, OnInit } from '@angular/core';
import { UiService } from '../../core/services/ui.service';
import { SupabaseService } from '../../core/services/supabase.service';

export type ConvenioPlan = {
  name: string;
  category?: string;
  price?: string;
  uf?: string;
  currency?: string;
  description?: string;
};

export type VoucherRow = {
  id: string;
  code?: string;
  title: string;
  partner_name?: string;
  logo?: string | null;
  category?: string;
  description: string | null;
  discount_label?: string;
  discount_type?: string;
  discount_value?: number | null;
  currency?: string;
  active: boolean;
  expires_at?: string;
  website?: string | null;
  contact_email?: string | null;
  location?: string | null;
  is_seniorclub?: boolean;
  plans?: ConvenioPlan[];
};

const SENIORCLUB_CONVENIOS: VoucherRow[] = [
  {
    id: 'sc-listamente',
    title: 'ListaMente 10% Dcto.',
    partner_name: 'ListaMente',
    logo: 'assets/partners/listamente.jpg',
    category: 'Estimulación cognitiva y memoria',
    description: 'Accede a un 10% de descuento exclusivo en estimulación cognitiva y bienestar cerebral. En el checkout de listamente.com haz clic en "Agregar cupón de descuento" e ingresa el código antes de finalizar la compra.',
    discount_label: '10% OFF',
    discount_type: 'percentage',
    discount_value: 10,
    currency: 'CLP',
    active: true,
    code: 'SA102026',
    website: 'https://www.listamente.com',
    is_seniorclub: true,
    expires_at: 'Convenio activo 2026',
  },
  {
    id: 'sc-beatriz',
    title: 'Psicóloga Beatriz Alvarado 15% Dscto.',
    partner_name: 'Psicóloga Beatriz Alvarado',
    logo: 'assets/partners/beatriz-alvarado.png',
    category: 'Psicogerontología y apoyo emocional',
    description: 'Psicología Clínica y opsicogerontología para personas adultas, mayores y familias que necesitan acompañamiento emocional en momentos de ansiedad, estrés, duelo, crisis vitales, sobrecarga o cambios asociados al envejecimiento y el cuidado. Un espacio profesional y confidencial para comprender el malestar, ordenar decisiones y construir un plan de apoyo person aliado. Benceficio SeniorClub: $30.000 (valor referente en atención psicológica. Valor referencial $40.000)',
    discount_label: '15% OFF',
    discount_type: 'percentage',
    discount_value: 15,
    currency: 'CLP',
    active: true,
    code: 'SENIORCLUB-BEATRIZ',
    website: 'https://www.doctoralia.cl/perfil/beatriz-alejandra-alvarado-valenzuela',
    is_seniorclub: true,
    expires_at: 'Convenio activo 2026',
    plans: [
      {
        name: '',
        category: '',
        price: 'Desde',
        uf: '/mes',
        description: 'Atención psicológica individual y familiar especializada en personas mayores y cuidadores.',
      },
    ],
  },
  {
    id: 'sc-quimun',
    title: 'Quimun 30% Dscto. / 3 meses',
    partner_name: 'Quimun',
    logo: 'assets/partners/quimun.png',
    category: 'Software para residencias ELEAM',
    description: '30% de descuento durante los primeros 3 meses de uso de Quimun. Implementación y configuración con costo $0, apoyo en carga masiva de residentes y soporte prioritario.',
    discount_label: '30% OFF / 3 meses',
    discount_type: 'percentage',
    discount_value: 30,
    currency: 'CLP',
    active: true,
    code: 'QUIMUN30',
    website: 'https://quimun.com',
    is_seniorclub: true,
    expires_at: 'Convenio activo 2026',
  },
  {
    id: 'sc-promsa',
    title: 'Promsa 15% Dscto.',
    partner_name: 'Promsa',
    logo: 'assets/partners/promsa.png',
    category: 'Ayudas técnicas y movilidad',
    description: '15% de descuento en toda la web promsa.cl. Especialistas en ayudas técnicas, sillas de ruedas, barras de seguridad y confort integral para pacientes y cuidadores.',
    discount_label: '15% OFF',
    discount_type: 'percentage',
    discount_value: 15,
    currency: 'CLP',
    active: true,
    code: 'SENIORADVISOR15',
    website: 'https://promsa.cl',
    is_seniorclub: true,
    expires_at: 'Convenio activo 2026',
  },
  {
    id: 'sc-quida',
    title: 'Quida 10% Dscto. (Planes Full)',
    partner_name: 'Quida',
    logo: 'assets/partners/quida.png',
    category: 'Monitoreo discreto en el hogar',
    description: 'Tecnología de cuidado no invasiva que protege a personas mayores que viven solas mediante pequeños sensores en el hogar (sin cámaras), resguardando su dignidad e independencia.',
    discount_label: '10% OFF',
    discount_type: 'percentage',
    discount_value: 10,
    currency: 'CLP',
    active: true,
    code: 'SENIOR10',
    website: 'https://quida.cl',
    location: 'Viña del Mar / Región Metropolitana',
    is_seniorclub: true,
    expires_at: 'Convenio activo 2026',
  },
  {
    id: 'sc-bilbi',
    title: 'Bilbi Vístete Fácil 20% Dscto.',
    partner_name: 'Bilbi',
    logo: 'assets/partners/bilbi.png',
    category: 'Vestuario adaptado y confort',
    description: '20% de descuento en todos los productos Bilbi. Ropa adaptada y diseñada para facilitar el vestir diario de personas mayores o con movilidad reducida.',
    discount_label: '20% OFF',
    discount_type: 'percentage',
    discount_value: 20,
    currency: 'CLP',
    active: true,
    code: 'Alladvisor20%',
    website: 'https://bilbi.cl',
    is_seniorclub: true,
    expires_at: 'Convenio activo 2026',
  },
  {
    id: 'sc-ducha',
    title: 'Ducha Segura 15% Dscto.',
    partner_name: 'Ducha Segura',
    logo: 'assets/partners/duchasegura.webp',
    category: 'Adaptación del baño y prevención',
    description: '15% de descuento en adaptación y rebaje de tinas a duchas a nivel de piso para evitar resbalones y garantizar máxima seguridad en el baño.',
    discount_label: '15% OFF',
    discount_type: 'percentage',
    discount_value: 15,
    currency: 'CLP',
    active: true,
    code: 'REBAJEDETINA26',
    website: 'https://duchasegura.cl',
    is_seniorclub: true,
    expires_at: 'Convenio activo 2026',
  },
  {
    id: 'sc-help',
    title: 'Help Rescate',
    partner_name: 'Help Rescate',
    logo: 'assets/partners/help.png',
    category: 'Rescate móvil, telemedicina y orientación 24/7',
    description: 'Más de 25 años acompañando a las personas en momentos donde la salud se vuelve una prioridad. Rescate móvil, telemedicina y orientación 24/7.',
    discount_label: 'Desde $8.336 /mes',
    discount_type: 'fixed_amount',
    discount_value: 8336,
    currency: 'CLP',
    active: true,
    code: 'SENIORCLUB-HELP',
    website: 'https://www.help.cl',
    location: 'Valparaíso, Metropolitana y Biobío',
    is_seniorclub: true,
    expires_at: 'Convenio activo 2026',
    plans: [
      {
        name: 'PLAN RESCATE +75 MÁS PLAN HOGAR',
        category: 'Desde 75 años y más',
        price: 'Desde $55.501',
        uf: 'Desde 1.40',
        description: 'Plan combinado de máxima protección. Rescate móvil especializado para adultos de 75 años o más junto a todas las asistencias del Plan Hogar.',
      },
      {
        name: 'PLAN RESCATE +75',
        category: 'Desde 75 años y más',
        price: 'Desde $51.204',
        uf: 'Desde 1.29',
        description: 'Rescate médico móvil 24/7 en ambulancias UTI móviles altamente equipadas para personas de 75 años y más.',
      },
      {
        name: 'PLAN HOGAR',
        category: 'Desde 0 a 99 años y más',
        price: 'Desde $8.336',
        uf: 'Desde 0.21',
        description: 'Médico general a domicilio (3 visitas/año), telemedicina ilimitada (4 consultas/mes), kinesiología respiratoria y motora, toma de muestras y apoyo psicológico virtual.',
      },
      {
        name: 'PLAN RESCATE TOTAL',
        category: 'Desde 0 a 74 años',
        price: 'Desde $32.152',
        uf: 'Desde 0.81',
        description: '8 rescates al año ante emergencias con riesgo vital, orientación médica 24/7, médico a domicilio, telemedicina y toma de exámenes.',
      },
      {
        name: 'PLAN RESCATE ÚNICO',
        category: 'Desde 0 a 65 años',
        price: 'Desde $13.099',
        uf: 'Desde 0.33',
        description: '1 rescate al año para emergencias médicas de riesgo vital, orientación médica telefónica 24/7 y telemedicina.',
      },
      {
        name: 'PLAN RESCATE BÁSICO',
        category: 'Desde 0 a 74 años',
        price: 'Desde $28.579',
        uf: 'Desde 0.72',
        description: '8 rescates al año a centros médicos en ambulancias de alta complejidad y orientación médica telefónica ilimitada 24/7.',
      },
      {
        name: 'PLAN RESCATE SEGURO',
        category: 'Desde 0 a 59 años',
        price: 'Desde $35.724',
        uf: 'Desde 0.90',
        description: '8 rescates al año, orientación médica 24/7, consultas médicas y seguro de accidentes de origen traumático con cobertura hasta 800 UF.',
      },
    ],
  },
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
  public selectedFilter: 'all' | 'seniorclub' | 'company' = 'all';
  public revealedCodes: Set<string> = new Set<string>();
  public selectedHelpPlan: string = 'PLAN RESCATE ÚNICO';
  public activeModalItem: VoucherRow | null = null;

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
      // 1. Fetch live SeniorClub partners from SeniorAdvisor API if online
      let livePartners: VoucherRow[] = [];
      try {
        const response = await fetch('https://www.senioradvisor.cl/api/partners/convenios');
        if (response.ok) {
          const apiData = await response.json();
          if (Array.isArray(apiData) && apiData.length > 0) {
            // Map live items and enrich with curated descriptions & logos
            livePartners = apiData.map((c: any) => {
              const cName = (c.name || '').toLowerCase();
              const matched = SENIORCLUB_CONVENIOS.find((sc) => {
                const scName = (sc.partner_name || '').toLowerCase();
                const scId = sc.id.toLowerCase().replace('sc-', '');
                return (
                  (c.slug && c.slug.toLowerCase().includes(scId)) ||
                  (scName && cName.includes(scName)) ||
                  (scName && scName.includes(cName.split(' ')[0]))
                );
              });
              return {
                id: c.convenio_id || c.slug || `sc-${Math.random()}`,
                title: matched?.title || c.name || 'Convenio SeniorClub',
                partner_name: matched?.partner_name || c.name?.split(' ')[0] || 'SeniorClub',
                logo: matched?.logo || c.logo || null,
                category: matched?.category || (c.location ? `Cobertura: ${c.location}` : 'Convenio SeniorClub'),
                description: matched?.description || c.description || null,
                discount_label: matched?.discount_label || c.name?.match(/\d+%\s*D[sc]+to\.?/i)?.[0] || 'Descuento Exclusivo',
                discount_type: matched?.discount_type || 'percentage',
                discount_value: matched?.discount_value || 15,
                currency: 'CLP',
                active: c.active !== false,
                code: matched?.code || c.discount_code || 'SENIORCLUB',
                website: matched?.website || c.website || null,
                contact_email: c.contact_email || null,
                location: matched?.location || c.location || null,
                is_seniorclub: true,
                expires_at: 'Convenio activo 2026',
                plans: matched?.plans || c.plans || undefined,
              };
            });
          }
        }
      } catch {
        // Fallback to offline curated list
      }

      const seniorClubItems = livePartners.length >= 7 ? livePartners : SENIORCLUB_CONVENIOS;

      // 2. Fetch custom company vouchers from Supabase if any
      let customCompanyVouchers: VoucherRow[] = [];
      try {
        const { data, error } = await this.supabase.client
          .from('vouchers')
          .select('id, code, title, description, discount_type, discount_value, currency, active')
          .eq('active', true)
          .order('title', { ascending: true });

        if (!error && Array.isArray(data)) {
          customCompanyVouchers = data.map((v) => ({
            ...v,
            is_seniorclub: false,
            category: 'Beneficio Corporativo',
          }));
        }
      } catch {
        // Silent catch for custom vouchers
      }

      this.items = [...seniorClubItems, ...customCompanyVouchers];
    } catch {
      this.items = SENIORCLUB_CONVENIOS;
    } finally {
      this.loading = false;
    }
  }

  public get filteredItems(): VoucherRow[] {
    if (this.selectedFilter === 'seniorclub') {
      return this.items.filter((item) => item.is_seniorclub);
    }
    if (this.selectedFilter === 'company') {
      return this.items.filter((item) => !item.is_seniorclub);
    }
    return this.items;
  }

  public get seniorClubCount(): number {
    return this.items.filter((item) => item.is_seniorclub).length;
  }

  public get percentageCount(): number {
    return this.items.filter((item) => item.discount_type === 'percentage').length;
  }

  public get fixedAmountCount(): number {
    return this.items.filter((item) => item.discount_type === 'fixed_amount').length;
  }

  public discountLabel(item: VoucherRow): string {
    if (item.discount_label) {
      return item.discount_label;
    }

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

  public isCodeRevealed(id: string): boolean {
    return this.revealedCodes.has(id);
  }

  public revealCode(id: string, code?: string): void {
    this.revealedCodes.add(id);
    if (code) {
      this.copyCode(code);
    }
  }

  public toggleReveal(id: string): void {
    if (this.revealedCodes.has(id)) {
      this.revealedCodes.delete(id);
    } else {
      this.revealedCodes.add(id);
    }
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

  public selectPlan(planName: string): void {
    this.selectedHelpPlan = planName;
  }

  public openPlanModal(item: VoucherRow): void {
    this.activeModalItem = item;
  }

  public closePlanModal(): void {
    this.activeModalItem = null;
  }

  public onLogoError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.style.display = 'none';
    }
  }
}
