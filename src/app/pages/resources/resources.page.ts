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
      this.resources = (data ?? []) as ResourceItem[];
    } catch (e: any) {
      this.error = e?.message ?? 'Error al cargar los recursos';
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
    // YouTube
    const ytMatch = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?/]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    // Vimeo
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