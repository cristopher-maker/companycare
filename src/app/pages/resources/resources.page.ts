import { Component, OnInit } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { UiService } from '../../core/services/ui.service';

export type ResourceCategory =
  | 'Opciones de cuidado'
  | 'Financiación'
  | 'Checklist'
  | 'Guías prácticas';

export type ResourceType = 'article' | 'pdf' | 'video';

export type ResourceSection = {
  heading: string;
  body: string;
  bullets?: string[];
};

export type ResourceItem = {
  id: string;
  title: string;
  summary: string;
  category: ResourceCategory;
  resource_type: ResourceType;
  content: ResourceSection[];
  file_url: string | null;
  video_url: string | null;
  read_time_min: number;
  is_priority: boolean;
};

const CATEGORY_KEY: Record<ResourceCategory, string> = {
  'Opciones de cuidado': 'care',
  'Financiación': 'finance',
  'Checklist': 'check',
  'Guías prácticas': 'guide',
};

const CATEGORY_ICON: Record<ResourceCategory, string> = {
  'Opciones de cuidado': `
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>`,
  'Financiación': `
    <rect x="1" y="4" width="22" height="16" rx="2"/>
    <line x1="1" y1="10" x2="23" y2="10"/>`,
  'Checklist': `
    <polyline points="9 11 12 14 22 4"/>
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>`,
  'Guías prácticas': `
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>`,
};

const FALLBACK_RESOURCES: ResourceItem[] = [
  {
    id: 'res-1',
    title: 'Guía Completa: Cómo evaluar el nivel de dependencia de un familiar',
    summary: 'Aprende a identificar los primeros signos de pérdida de autonomía física y cognitiva en adultos mayores.',
    category: 'Opciones de cuidado',
    resource_type: 'pdf',
    read_time_min: 8,
    is_priority: true,
    file_url: null,
    video_url: null,
    content: [
      {
        heading: '1. Actividades Básicas de la Vida Diaria (ABVD)',
        body: 'La evaluación comienza observando la capacidad para realizar tareas cotidianas esenciales sin asistencia externa.',
        bullets: ['Alimentación e hidratación autónoma', 'Movilidad y desplazamiento dentro del hogar', 'Higiene personal y vestimenta']
      },
      {
        heading: '2. Escalas de Valoración Recomendadas',
        body: 'Utiliza metodologías validadas como el Índice de Barthel o la Escala de Lawton y Brody para determinar si se requiere un cuidador o residencia.'
      }
    ]
  },
  {
    id: 'res-2',
    title: 'Financiamiento y Beneficios Estatales para Cuidados en Chile',
    summary: 'Revisión paso a paso de subsidios, estipendios para cuidadores y cobertura GES para adultos mayores.',
    category: 'Financiación',
    resource_type: 'article',
    read_time_min: 12,
    is_priority: true,
    file_url: null,
    video_url: null,
    content: [
      {
        heading: 'Estipendio para Cuidador Informal',
        body: 'Detalle sobre los requisitos de postulación al subsidio monetario para cuidadores no remunerados a través de la red de protección del Estado.'
      },
      {
        heading: 'Cobertura en Salud Preventiva',
        body: 'Acceso a programas de salud primaria (EMPAM) y atención domiciliaria para personas con dependencia severa.'
      }
    ]
  },
  {
    id: 'res-3',
    title: 'Checklist: Auditoría de Seguridad Domiciliaria para Adultos Mayores',
    summary: 'Lista de verificación práctica para adaptar baños, pasillos y dormitorios evitando caídas y accidentes.',
    category: 'Checklist',
    resource_type: 'pdf',
    read_time_min: 5,
    is_priority: false,
    file_url: null,
    video_url: null,
    content: [
      {
        heading: 'Prevención de Caídas en el Hogar',
        body: 'La mayoría de los accidentes domésticos ocurren en el baño y en zonas con mala iluminación.',
        bullets: ['Instalación de barras de sujeción en ducha y WC', 'Eliminación de alfombras sueltas y cables expuestos', 'Iluminación nocturna con sensores en pasillos']
      }
    ]
  },
  {
    id: 'res-4',
    title: 'Guía de Manejo del Desgaste Emocional en el Cuidador',
    summary: 'Herramientas psicológicas para prevenir el síndrome de Burnout del cuidador y gestionar el estrés familiar.',
    category: 'Guías prácticas',
    resource_type: 'article',
    read_time_min: 10,
    is_priority: false,
    file_url: null,
    video_url: null,
    content: [
      {
        heading: 'Reconociendo el Agotamiento',
        body: 'El cuidado prolongado puede generar fatiga crónica, insomnio y sobrecarga emocional.',
        bullets: ['Establecer pausas de descanso semanales', 'Delegar tareas entre familiares o servicios profesionales', 'Mantener espacios personales de desconexión']
      }
    ]
  },
  {
    id: 'res-5',
    title: 'Cómo Elegir un Centro Residencial o ELEAM de Calidad',
    summary: 'Criterios de auditoría médica, acreditación de infraestructura y proporción de cuidadores por residente.',
    category: 'Opciones de cuidado',
    resource_type: 'article',
    read_time_min: 9,
    is_priority: false,
    file_url: null,
    video_url: null,
    content: [
      {
        heading: 'Requisitos de Acreditación',
        body: 'Verifica la autorización sanitaria de SEREMI de Salud y los protocolos de emergencia médica.',
        bullets: ['Ratio adecuado de personal técnico por residente', 'Menú nutricional supervisado por profesional', 'Transparencia en reportes y visitas a familiares']
      }
    ]
  },
  {
    id: 'res-6',
    title: 'Planificación Legal y Poderes Notariales en Etapas Tempranas',
    summary: 'Aspectos legales clave para la toma de decisiones médicas y financieras anticipadas en la familia.',
    category: 'Guías prácticas',
    resource_type: 'pdf',
    read_time_min: 7,
    is_priority: false,
    file_url: null,
    video_url: null,
    content: [
      {
        heading: 'Poderes de Representación',
        body: 'Recomendaciones notariales para formalizar la administración de salud y patrimonio de manera transparente y coordinada.'
      }
    ]
  }
];

@Component({
  selector: 'app-resources',
  templateUrl: './resources.page.html',
  styleUrls: ['./resources.page.scss'],
})
export class ResourcesPage implements OnInit {
  public selectedCategory: 'Todos' | ResourceCategory = 'Todos';
  public searchQuery = '';
  public activeResource: ResourceItem | null = null;
  public resources: ResourceItem[] = [];
  public loading = true;
  public error: string | null = null;

  public readonly categories: readonly ResourceCategory[] = [
    'Opciones de cuidado',
    'Financiación',
    'Checklist',
    'Guías prácticas',
  ] as const;

  constructor(
    public readonly ui: UiService,
    private supabase: SupabaseService,
  ) {}

  ngOnInit(): void {
    void this.loadResources();
  }

  async loadResources(): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      const { data, error } = await this.supabase.client
        .from('resources')
        .select('id, title, summary, category, resource_type, content, file_url, video_url, read_time_min, is_priority')
        .eq('is_published', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      const loaded = (data ?? []) as ResourceItem[];
      this.resources = loaded.length > 0 ? loaded : FALLBACK_RESOURCES;
    } catch (e: any) {
      this.resources = FALLBACK_RESOURCES;
    } finally {
      this.loading = false;
    }
  }

  public get filteredResources(): ResourceItem[] {
    return this.resources.filter((r) => {
      const matchCat = this.selectedCategory === 'Todos' || r.category === this.selectedCategory;
      const q = this.searchQuery.toLowerCase();
      const matchSearch = !q || r.title.toLowerCase().includes(q) || r.summary.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }

  public setCategory(category: 'Todos' | ResourceCategory): void {
    this.selectedCategory = category;
  }

  public open(resource: ResourceItem): void {
    this.activeResource = resource;
    document.body.style.overflow = 'hidden';
  }

  public closeDrawer(): void {
    this.activeResource = null;
    document.body.style.overflow = '';
  }

  public getEmbedUrl(videoUrl: string): string {
    const ytMatch = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?/]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vmMatch = videoUrl.match(/vimeo\.com\/(\d+)/);
    if (vmMatch) return `https://player.vimeo.com/video/${vmMatch[1]}`;
    return videoUrl;
  }

  public typeIcon(type: ResourceType): string {
    return { article: 'article', pdf: 'picture_as_pdf', video: 'play_circle' }[type] ?? 'article';
  }

  public typeLabel(type: ResourceType): string {
    return { article: 'Artículo', pdf: 'PDF', video: 'Video' }[type] ?? type;
  }

  public categoryKey(category: ResourceCategory): string {
    return CATEGORY_KEY[category] ?? 'guide';
  }

  public categoryIconPath(category: ResourceCategory): string {
    return CATEGORY_ICON[category] ?? '';
  }

  public trackById(_: number, r: ResourceItem): string { return r.id; }
  public trackByCat(_: number, c: ResourceCategory): string { return c; }
  public trackByHeading(_: number, s: ResourceSection): string { return s.heading; }
}