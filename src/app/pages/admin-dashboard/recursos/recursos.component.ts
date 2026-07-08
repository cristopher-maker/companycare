import { Component, OnInit } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';

export type ResourceCategory =
  | 'Opciones de cuidado'
  | 'Financiación'
  | 'Checklist'
  | 'Guías prácticas';

export type ResourceType = 'article' | 'pdf' | 'video';

export interface ResourceSection {
  heading: string;
  body: string;
  bullets?: string[];
}

export interface ResourceRow {
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
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

type FormMode = 'create' | 'edit';

const EMPTY_RESOURCE = (): Partial<ResourceRow> => ({
  title: '',
  summary: '',
  category: 'Guías prácticas',
  resource_type: 'article',
  content: [{ heading: '', body: '', bullets: [] }],
  file_url: null,
  video_url: null,
  read_time_min: 5,
  is_priority: false,
  is_published: false,
  sort_order: 0,
});

@Component({
  selector: 'app-recursos',
  templateUrl: './recursos.component.html',
  styleUrls: ['../admin-shared.scss'],
})
export class RecursosComponent implements OnInit {
  resources: ResourceRow[] = [];
  loading = true;
  saving = false;
  error: string | null = null;

  showModal = false;
  formMode: FormMode = 'create';
  form: Partial<ResourceRow> = EMPTY_RESOURCE();
  editingId: string | null = null;

  uploadingPdf = false;
  uploadProgress = 0;
  pdfFileName: string | null = null;

  filterStatus: 'all' | 'published' | 'draft' = 'all';
  searchQuery = '';

  readonly categories: ResourceCategory[] = [
    'Opciones de cuidado',
    'Financiación',
    'Checklist',
    'Guías prácticas',
  ];

  readonly typeOptions: { value: ResourceType; label: string; icon: string }[] = [
    { value: 'article', label: 'Artículo', icon: 'article' },
    { value: 'pdf', label: 'PDF / Guía', icon: 'picture_as_pdf' },
    { value: 'video', label: 'Video', icon: 'play_circle' },
  ];

  constructor(private supabase: SupabaseService) {}

  ngOnInit(): void {
    void this.loadResources();
  }

  // ---- Data ---------------------------------------------------------------

  async loadResources(): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      const { data, error } = await this.supabase.client
        .from('resources')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      this.resources = (data ?? []) as ResourceRow[];
    } catch (e: any) {
      this.error = e?.message ?? 'Error al cargar recursos';
    } finally {
      this.loading = false;
    }
  }

  get filteredResources(): ResourceRow[] {
    return this.resources.filter((r) => {
      const matchStatus =
        this.filterStatus === 'all' ||
        (this.filterStatus === 'published' && r.is_published) ||
        (this.filterStatus === 'draft' && !r.is_published);
      const q = this.searchQuery.toLowerCase();
      const matchSearch =
        !q || r.title.toLowerCase().includes(q) || r.summary.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }

  // ---- Modal --------------------------------------------------------------

  openCreate(): void {
    this.formMode = 'create';
    this.form = EMPTY_RESOURCE();
    this.editingId = null;
    this.pdfFileName = null;
    this.showModal = true;
  }

  openEdit(r: ResourceRow): void {
    this.formMode = 'edit';
    this.editingId = r.id;
    this.form = {
      ...r,
      content: r.content?.length ? r.content : [{ heading: '', body: '', bullets: [] }],
    };
    this.pdfFileName = r.file_url ? r.file_url.split('/').pop() ?? null : null;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.form = EMPTY_RESOURCE();
    this.editingId = null;
    this.pdfFileName = null;
  }

  // ---- Sections -----------------------------------------------------------

  addSection(): void {
    this.form.content = [...(this.form.content ?? []), { heading: '', body: '', bullets: [] }];
  }

  removeSection(index: number): void {
    this.form.content = (this.form.content ?? []).filter((_, i) => i !== index);
  }

  getBulletText(section: ResourceSection): string {
    return (section.bullets ?? []).join('\n');
  }

  setBulletText(section: ResourceSection, value: string): void {
    section.bullets = value
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  }

  trackByIndex(i: number): number {
    return i;
  }

  // ---- PDF Upload ---------------------------------------------------------

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Solo se permiten archivos PDF.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      alert('El archivo no puede superar 20 MB.');
      return;
    }

    this.uploadingPdf = true;
    this.uploadProgress = 0;
    this.pdfFileName = file.name;

    try {
      const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { data, error } = await this.supabase.client.storage
        .from('resources-files')
        .upload(filename, file, { upsert: false });
      if (error) throw error;

      const { data: urlData } = this.supabase.client.storage
        .from('resources-files')
        .getPublicUrl(data.path);
      this.form.file_url = urlData.publicUrl;
      this.uploadProgress = 100;
    } catch (e: any) {
      alert(`Error al subir PDF: ${e?.message ?? 'desconocido'}`);
      this.pdfFileName = null;
      this.form.file_url = null;
    } finally {
      this.uploadingPdf = false;
    }
  }

  removePdf(): void {
    this.form.file_url = null;
    this.pdfFileName = null;
  }

  // ---- Save ---------------------------------------------------------------

  async save(): Promise<void> {
    if (!this.form.title?.trim()) { alert('El título es obligatorio.'); return; }
    if (!this.form.summary?.trim()) { alert('El resumen es obligatorio.'); return; }

    this.saving = true;
    try {
      const payload = {
        title: this.form.title!.trim(),
        summary: this.form.summary!.trim(),
        category: this.form.category,
        resource_type: this.form.resource_type,
        content: (this.form.content ?? []).filter((s) => s.heading.trim() || s.body.trim()),
        file_url: this.form.file_url ?? null,
        video_url: this.form.video_url?.trim() || null,
        read_time_min: this.form.read_time_min ?? 5,
        is_priority: this.form.is_priority ?? false,
        is_published: this.form.is_published ?? false,
        sort_order: this.form.sort_order ?? 0,
      };

      if (this.formMode === 'create') {
        const { error } = await this.supabase.client.from('resources').insert(payload);
        if (error) throw error;
      } else {
        const { error } = await this.supabase.client
          .from('resources')
          .update(payload)
          .eq('id', this.editingId!);
        if (error) throw error;
      }
      this.closeModal();
      await this.loadResources();
    } catch (e: any) {
      alert(`Error al guardar: ${e?.message ?? 'desconocido'}`);
    } finally {
      this.saving = false;
    }
  }

  // ---- Toggle Publish / Priority ------------------------------------------

  async togglePublish(r: ResourceRow): Promise<void> {
    const { error } = await this.supabase.client
      .from('resources')
      .update({ is_published: !r.is_published })
      .eq('id', r.id);
    if (!error) r.is_published = !r.is_published;
  }

  async togglePriority(r: ResourceRow): Promise<void> {
    const { error } = await this.supabase.client
      .from('resources')
      .update({ is_priority: !r.is_priority })
      .eq('id', r.id);
    if (!error) r.is_priority = !r.is_priority;
  }

  // ---- Delete -------------------------------------------------------------

  async deleteResource(r: ResourceRow): Promise<void> {
    if (!confirm(`¿Eliminar "${r.title}"? Esta acción no se puede deshacer.`)) return;
    const { error } = await this.supabase.client.from('resources').delete().eq('id', r.id);
    if (!error) this.resources = this.resources.filter((x) => x.id !== r.id);
    else alert(`Error al eliminar: ${error.message}`);
  }

  // ---- Helpers ------------------------------------------------------------

  typeIcon(type: ResourceType): string {
    return { article: 'article', pdf: 'picture_as_pdf', video: 'play_circle' }[type] ?? 'article';
  }

  typeLabel(type: ResourceType): string {
    return { article: 'Artículo', pdf: 'PDF', video: 'Video' }[type] ?? type;
  }

  trackById(_: number, r: ResourceRow): string {
    return r.id;
  }
}
