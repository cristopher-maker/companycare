import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { UiService } from '../../core/services/ui.service';
import { SupabaseService } from '../../core/services/supabase.service';

type TrainingTab = 'Cursos' | 'Eventos';
type CourseLevel = 'Básico' | 'Intermedio';

export type CourseLesson = {
  id: string;
  title: string;
  duration: string;
  summary: string;
  content: string;
  tips: string[];
  checklist?: string[];
};

type DbCourse = {
  id: string;
  title: string;
  duration_minutes: number;
  level: CourseLevel;
  lessons?: CourseLesson[];
};

type DbEnrollment = {
  course_id: string | null;
  status: 'enrolled' | 'completed' | 'canceled';
  progress_percent: number;
  last_accessed_at: string | null;
};

type CourseState = 'not_started' | 'in_progress' | 'completed';

export type CourseCard = {
  id: string;
  title: string;
  duration: string;
  level: CourseLevel;
  state: CourseState;
  progress: number;
  lastAccessedAt: number | null;
  isActive: boolean;
  actionLabel: string;
  actionArrow: boolean;
  lessons: CourseLesson[];
};

type EventItem = {
  id: string;
  title: string;
  date: string;
  format: 'Online' | 'Presencial';
};

const DEFAULT_COURSES: DbCourse[] = [
  {
    id: 'c1',
    title: 'Fundamentos del Cuidado Domiciliario y Prevención de Riesgos',
    duration_minutes: 25,
    level: 'Básico',
    lessons: [
      {
        id: 'l1-1',
        title: 'Módulo 1: Evaluación del Entorno y Prevención de Caídas',
        duration: '8 min',
        summary: 'Identifica riesgos de tropezón y adapta las áreas más críticas del hogar.',
        content: 'Las caídas representan la principal causa de pérdida de autonomía en personas mayores. Adaptar el entorno doméstico reduce hasta en un 70% los accidentes en el hogar.',
        tips: [
          'Instala iluminación de encendido automático con sensor en los pasillos que conducen al baño.',
          'Mantén las zonas de paso despejadas y sin alfombras pequeñas sin fijación antideslizante.'
        ],
        checklist: [
          'Retirar alfombras sueltas en pasillos y dormitorios.',
          'Instalar barras de sujeción al costado del WC y dentro de la ducha.',
          'Asegurar cableado eléctrico fijado a los guardapolvos.'
        ]
      },
      {
        id: 'l1-2',
        title: 'Módulo 2: Movilidad Segura y Ergonomía del Cuidador',
        duration: '9 min',
        summary: 'Técnicas de transferencia segura para proteger la espalda del cuidador y dar firmeza al adulto mayor.',
        content: 'Al realizar transferencias (de la cama a la silla), mantén siempre las rodillas flexionadas y la espalda recta, utilizando la fuerza de tus piernas para evitar lesiones lumbares.',
        tips: [
          'Usa calzado cerrado con suela de goma antideslizante tanto para ti como para el familiar.',
          'Asegura siempre los frenos de la silla de ruedas antes de iniciar cualquier movimiento.'
        ],
        checklist: [
          'Verificar que el piso esté completamente seco antes de iniciar el movimiento.',
          'Coordinar con la persona el conteo 1, 2, 3 antes de ponerse de pie.'
        ]
      },
      {
        id: 'l1-3',
        title: 'Módulo 3: Plan de Emergencias y Ficha Médica Visible',
        duration: '8 min',
        summary: 'Protocolo de actuación rápida ante descompensaciones de salud o accidentes.',
        content: 'Tener a mano la información clínica condensada ahorra minutos valiosos para los equipos de emergencia médica.',
        tips: [
          'Mantén una ficha en la puerta del refrigerador con diagnóstico, alergias y medicamentos en uso.',
          'Guarda en la marcación rápida del teléfono los contactos de rescate médico y del médico tratante.'
        ],
        checklist: [
          'Revisar el botiquín de primeros auxilios y fechas de vencimiento.',
          'Compartir la ficha de emergencia con los demás integrantes del hogar.'
        ]
      }
    ]
  },
  {
    id: 'c2',
    title: 'Comunicación Asertiva y Gestión del Estrés en el Entorno Familiar',
    duration_minutes: 35,
    level: 'Intermedio',
    lessons: [
      {
        id: 'l2-1',
        title: 'Módulo 1: Empatía y Comunicación ante Cambios de Conducta',
        duration: '12 min',
        summary: 'Estrategias para mantener la calma y responder con contención emocional.',
        content: 'Frente a la rigidez conductual o desorientación, la validación emocional ("Entiendo que te sientas frustrado") es más efectiva que intentar corregir con lógica fría.',
        tips: [
          'Usa frases breves, tono de voz pausado y mantén contacto visual al comunicarte.',
          'Evita discutir o confrontar sobre recuerdos distorsionados; redirige la atención hacia una actividad grata.'
        ],
        checklist: [
          'Practicar técnicas de respiración profunda antes de responder en momentos de tensión.',
          'Mantener un ambiente tranquilo reduciendo ruidos molestos de fondo.'
        ]
      },
      {
        id: 'l2-2',
        title: 'Módulo 2: Distribución Equitativa de Tareas Familiares',
        duration: '13 min',
        summary: 'Cómo acordar turnos y responsabilidades sin generar conflictos familiares.',
        content: 'El cuidado prolongado no debe recaer en una sola persona. Definir un calendario claro distribuye la carga física y financiera.',
        tips: [
          'Asigna tareas específicas según las fortalezas de cada familiar (trámites, visitas, compras).',
          'Utiliza un grupo de mensajería exclusivo para novedades de cuidado y actualización médica.'
        ],
        checklist: [
          'Elaborar el calendario mensual de turnos y apoyos.',
          'Agendar una reunión familiar breve para revisar el estado del cuidado.'
        ]
      },
      {
        id: 'l2-3',
        title: 'Módulo 3: Prevención del Síndrome del Cuidador Quemado (Burnout)',
        duration: '10 min',
        summary: 'Identificación temprana del agotamiento y pausas de descanso obligatorias.',
        content: 'Cuidar de ti mismo es el primer requisito para cuidar bien a otros. Desconectar periódicamente previene el insomnio y la fatiga crónica.',
        tips: [
          'Programa al menos 2 horas a la semana dedicadas exclusivamente a tus pasatiempos o descanso.',
          'No dudes en solicitar servicios de reemplazo temporal o voluntariado de apoyo.'
        ],
        checklist: [
          'Fijar un espacio diario de desconexión sin revisar mensajes de trabajo ni de cuidado.',
          'Consultar con un profesional de salud si experimentas insomnio prolongado.'
        ]
      }
    ]
  },
  {
    id: 'c3',
    title: 'Navegación de Salud, Trámites y Coberturas Sociales',
    duration_minutes: 20,
    level: 'Básico',
    lessons: [
      {
        id: 'l3-1',
        title: 'Módulo 1: Requisitos para Subsidios y Estipendios de Cuidado',
        duration: '10 min',
        summary: 'Pasos para postular al estipendio para cuidadores informales del Estado.',
        content: 'Conoce la documentación necesaria para inscribir al cuidador en el Registro Nacional y acceder a subsidios de apoyo económico.',
        tips: [
          'Asegúrate de tener actualizado el Registro Social de Hogares y la acreditación de dependencia.',
          'Solicita el certificado de dependencia severa en el CESFAM correspondiente.'
        ],
        checklist: [
          'Obtener ClaveÚnica para trámites en línea.',
          'Revisar vigencia del carnet de cuidador o certificación de dependencia.'
        ]
      },
      {
        id: 'l3-2',
        title: 'Módulo 2: Activación de Garantías Explícitas en Salud (GES/AUGE)',
        duration: '10 min',
        summary: 'Cómo hacer valer la cobertura legal en tratamiento y medicamentos.',
        content: 'Las patologías asociadas al adulto mayor cuentan con plazos máximos de atención y cobertura garantizada por ley.',
        tips: [
          'Solicita el formulario de notificación GES a tu médico tratante ante un nuevo diagnóstico.',
          'Verifica la entrega preferencial de medicamentos en la farmacia de tu centro de salud.'
        ],
        checklist: [
          'Guardar copia del formulario de notificación GES expedido por el médico.',
          'Agendar las fechas de retiro mensual de medicamentos.'
        ]
      }
    ]
  },
  {
    id: 'c4',
    title: 'Primeros Auxilios y Manejo de Emergencias Domiciliarias',
    duration_minutes: 40,
    level: 'Intermedio',
    lessons: [
      {
        id: 'l4-1',
        title: 'Módulo 1: Medición de Signos Vitales y Alerta Temprana',
        duration: '15 min',
        summary: 'Uso correcto del manómetro, oxímetro y detección de síntomas de ACV.',
        content: 'Aprende a reconocer la regla FAST (Cara caída, Brazo débil, Dificultad para hablar, Tiempo de llamar al 131/emergencia).',
        tips: [
          'Toma la presión arterial en reposo, tras 5 minutos de estar sentado y en un ambiente tranquilo.',
          'Registra las lecturas en una libreta con fecha y hora para mostrarlas al médico.'
        ],
        checklist: [
          'Tener oxímetro de pulso y tensiómetro digital con baterías cargadas.',
          'Anotar en una libreta las variaciones diarias de signos vitales.'
        ]
      },
      {
        id: 'l4-2',
        title: 'Módulo 2: Maniobras de Heimlich y Curación de Piel Frágil',
        duration: '25 min',
        summary: 'Primer auxilio ante atragantamientos y prevención de úlceras por presión.',
        content: 'La piel de las personas mayores es extremadamente delgada. Los cambios de posición cada 2 horas evitan lesiones cutáneas severas.',
        tips: [
          'Usa cremas hidratantes con ácidos grasos hiperoxigenados para proteger zonas de presión.',
          'En caso de atragantamiento parcial, estimula la tos fuerte sin dar golpazos en la espalda.'
        ],
        checklist: [
          'Revisar diariamente talones, sacro y codos en busca de zonas enrojecidas.',
          'Tener cojines de alivio de presión en sillas y cama.'
        ]
      }
    ]
  }
];

@Component({
  selector: 'app-training',
  templateUrl: './training.page.html',
  styleUrls: ['./training.page.scss'],
})
export class TrainingPage implements OnInit {
  public tab: TrainingTab = 'Cursos';
  public isStaff = false;
  public activeCourse: CourseCard | null = null;
  public activeLessonIndex = 0;
  public checkedChecklistItems: Record<string, boolean> = {};

  public courses: DbCourse[] = [];
  public enrollments: DbEnrollment[] = [];

  public readonly events: EventItem[] = [
    {
      id: 'e1',
      title: 'Webinar: navegación de beneficios y financiación',
      date: 'Próximamente',
      format: 'Online',
    },
    {
      id: 'e2',
      title: 'Taller: conversaciones difíciles en familia',
      date: 'Próximamente',
      format: 'Online',
    },
  ];

  constructor(
    private readonly auth: AuthService,
    private readonly supabase: SupabaseService,
    public readonly ui: UiService
  ) {}

  public get userId(): string | null {
    return this.auth.user?.id ?? null;
  }

  public get completedCount(): number {
    return this.courseCards.filter((c) => c.state === 'completed').length;
  }

  public get overallProgressPercent(): number {
    const total = this.courses.length;
    if (!total) return 0;
    return Math.round((this.completedCount / total) * 100);
  }

  public get inProgressCount(): number {
    return this.courseCards.filter((c) => c.state === 'in_progress').length;
  }

  public get notStartedCount(): number {
    return this.courseCards.filter((c) => c.state === 'not_started').length;
  }

  public get currentLesson(): CourseLesson | null {
    if (!this.activeCourse || !this.activeCourse.lessons.length) return null;
    return this.activeCourse.lessons[this.activeLessonIndex] ?? this.activeCourse.lessons[0] ?? null;
  }

  public get courseCards(): CourseCard[] {
    const byCourseId = new Map<string, DbEnrollment>();
    for (const e of this.enrollments) {
      if (e.course_id) byCourseId.set(e.course_id, e);
    }

    const cards = this.courses.map((c) => {
      const e = byCourseId.get(c.id) ?? null;
      const progress = Math.max(0, Math.min(100, e?.progress_percent ?? 0));
      const state: CourseState =
        e?.status === 'completed' || progress >= 100 ? 'completed' : progress > 0 ? 'in_progress' : 'not_started';

      const lastAccessedAt = e?.last_accessed_at ? Date.parse(e.last_accessed_at) : null;

      const actionLabel = state === 'completed' ? 'Repasar' : state === 'in_progress' ? 'Continuar' : 'Iniciar';
      const actionArrow = state !== 'completed';

      return {
        id: c.id,
        title: c.title,
        duration: `${c.duration_minutes} min`,
        level: c.level,
        state,
        progress,
        lastAccessedAt,
        isActive: false,
        actionLabel,
        actionArrow,
        lessons: c.lessons ?? DEFAULT_COURSES.find((dc) => dc.id === c.id)?.lessons ?? []
      };
    });

    const activeId = this.pickActiveCourseId(cards);
    for (const card of cards) card.isActive = card.id === activeId;
    return cards;
  }

  private pickActiveCourseId(cards: CourseCard[]): string | null {
    const withLast = cards.filter((c) => c.lastAccessedAt != null);
    if (withLast.length) {
      withLast.sort((a, b) => (b.lastAccessedAt ?? 0) - (a.lastAccessedAt ?? 0));
      return withLast[0]!.id;
    }

    const inProgress = cards.find((c) => c.state === 'in_progress');
    return inProgress?.id ?? null;
  }

  public async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  private async loadData(): Promise<void> {
    await this.loadRole();

    try {
      const { data: courseData, error: courseError } = await this.supabase.client
        .from('training_courses')
        .select('id,title,duration_minutes,level')
        .eq('active', true)
        .order('created_at', { ascending: true });
      if (courseError) throw courseError;
      const loaded = (courseData ?? []) as DbCourse[];
      this.courses = loaded.length > 0 ? loaded : DEFAULT_COURSES;
    } catch {
      this.courses = DEFAULT_COURSES;
    }

    const userId = this.userId;
    if (!userId) {
      return;
    }

    try {
      const { data: enrollmentData, error: enrollmentError } = await this.supabase.client
        .from('training_enrollments')
        .select('course_id,status,progress_percent,last_accessed_at')
        .eq('user_id', userId)
        .not('course_id', 'is', null);
      if (enrollmentError) throw enrollmentError;
      this.enrollments = (enrollmentData ?? []) as DbEnrollment[];
    } catch {
      // keep local enrollments array
    }
  }

  private async loadRole(): Promise<void> {
    const userId = this.userId;
    if (!userId) {
      this.isStaff = false;
      return;
    }

    try {
      const { data, error } = await this.supabase.client
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;

      const role = (data?.role as string | undefined) ?? null;
      this.isStaff = role === 'admin' || role === 'company_admin' || role === 'care_expert';
    } catch {
      this.isStaff = false;
    }
  }

  public async onCourseAction(course: CourseCard): Promise<void> {
    const existing = this.enrollments.find((e) => e.course_id === course.id);
    if (!existing) {
      this.enrollments.push({
        course_id: course.id,
        status: 'enrolled',
        progress_percent: 25,
        last_accessed_at: new Date().toISOString(),
      });
    }

    this.openCourseModal(course);

    if (this.userId) {
      try {
        if (course.state === 'not_started') {
          await this.startCourse(course.id);
        } else if (course.state === 'in_progress') {
          await this.advanceCourse(course.id, course.progress);
        } else {
          await this.touchCourse(course.id);
        }
      } catch {
        // Fallback handled locally
      }
    }
  }

  public openCourseModal(course: CourseCard): void {
    this.activeCourse = course;
    this.activeLessonIndex = 0;
    document.body.style.overflow = 'hidden';
  }

  public closeCourseModal(): void {
    this.activeCourse = null;
    document.body.style.overflow = '';
  }

  public selectLesson(index: number): void {
    this.activeLessonIndex = index;
  }

  public toggleCheckItem(item: string): void {
    this.checkedChecklistItems[item] = !this.checkedChecklistItems[item];
  }

  public advanceActiveCourse(): void {
    if (!this.activeCourse) return;
    const totalLessons = this.activeCourse.lessons.length || 3;
    const existing = this.enrollments.find((e) => e.course_id === this.activeCourse!.id);
    
    if (this.activeLessonIndex < totalLessons - 1) {
      this.activeLessonIndex++;
    }

    const nextProgress = Math.min(100, Math.round(((this.activeLessonIndex + 1) / totalLessons) * 100));

    if (existing) {
      existing.progress_percent = Math.max(existing.progress_percent, nextProgress);
      if (existing.progress_percent >= 100) {
        existing.status = 'completed';
      }
      existing.last_accessed_at = new Date().toISOString();
    } else {
      this.enrollments.push({
        course_id: this.activeCourse.id,
        status: nextProgress >= 100 ? 'completed' : 'enrolled',
        progress_percent: nextProgress,
        last_accessed_at: new Date().toISOString(),
      });
    }

    const updated = this.courseCards.find((c) => c.id === this.activeCourse!.id);
    if (updated) {
      this.activeCourse = updated;
    }
  }

  private async startCourse(courseId: string): Promise<void> {
    const userId = this.userId!;
    const now = new Date().toISOString();

    const { error } = await this.supabase.client.from('training_enrollments').upsert(
      {
        user_id: userId,
        course_id: courseId,
        status: 'enrolled',
        progress_percent: 25,
        last_accessed_at: now,
      } as any,
      { onConflict: 'user_id,course_id' }
    );
    if (error) throw error;
  }

  private async advanceCourse(courseId: string, currentProgress: number): Promise<void> {
    const userId = this.userId!;
    const next = Math.min(100, Math.max(0, currentProgress) + 25);
    const now = new Date().toISOString();

    const { error } = await this.supabase.client
      .from('training_enrollments')
      .update({
        progress_percent: next,
        status: next >= 100 ? 'completed' : 'enrolled',
        last_accessed_at: now,
      } as any)
      .eq('user_id', userId)
      .eq('course_id', courseId);
    if (error) throw error;
  }

  private async touchCourse(courseId: string): Promise<void> {
    const userId = this.userId!;
    const now = new Date().toISOString();

    const { error } = await this.supabase.client
      .from('training_enrollments')
      .update({ last_accessed_at: now } as any)
      .eq('user_id', userId)
      .eq('course_id', courseId);
    if (error) throw error;
  }

  public trackById(_: number, item: { id: string }): string {
    return item.id;
  }

  public courseStateIcon(state: CourseState): string {
    if (state === 'completed') return 'task_alt';
    if (state === 'in_progress') return 'play_circle';
    return 'menu_book';
  }

  public courseStateClass(state: CourseState): string {
    return state;
  }
}
