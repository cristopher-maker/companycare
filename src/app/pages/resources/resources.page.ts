import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { UiService } from '../../core/services/ui.service';

export type ResourceCategory =
  | 'Opciones de cuidado'
  | 'Financiación'
  | 'Checklist'
  | 'Guías prácticas'
  | 'Formación';

export type ResourceType = 'article' | 'pdf' | 'video';

export type CourseLesson = {
  id: string;
  title: string;
  duration?: string;
  summary: string;
  content: string;
  tips?: string[];
  checklist?: string[];
};

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
  lessons?: CourseLesson[];
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
  'Formación': 'training',
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
  'Formación': `
    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
    <path d="M6 12v5c3 3 9 3 12 0v-5"/>`,
};

const FALLBACK_RESOURCES: ResourceItem[] = [
  {
    id: 'res-guia-v4',
    title: 'Guía Oficial CompanyCare',
    summary: 'Manual completo de acompañamiento, orientación y recursos para colaboradores y cuidadores de adultos mayores.',
    category: 'Guías prácticas',
    resource_type: 'pdf',
    read_time_min: 15,
    is_priority: true,
    file_url: 'assets/pdf/Guia_CompanyCare_v4.pdf',
    video_url: null,
    content: [
      {
        heading: 'Guía Integral del Cuidador CompanyCare',
        body: 'Documento completo con recomendaciones gerontológicas, evaluación de necesidades, red de apoyo y orientación para familias.',
        bullets: [
          'Estrategias de cuidado diario y prevención de sobrecarga',
          'Evaluación de autonomía y niveles de dependencia',
          'Red de convenios SeniorClub y proveedores verificados',
          'Protocolos de asesoría personalizada con Care Experts'
        ]
      }
    ]
  },
  {
    id: 'res-v1',
    title: '4 Pilares del Cuidado Senior',
    summary: 'Video explicativo con los 4 pilares fundamentales para acompañar el cuidado integral de un familiar adulto mayor.',
    category: 'Guías prácticas',
    resource_type: 'video',
    read_time_min: 3,
    is_priority: true,
    file_url: null,
    video_url: 'https://youtu.be/0DBr6_GmlQU',
    content: [
      {
        heading: 'Los 4 Pilares del Cuidado',
        body: 'En este video se detallan los ejes esenciales para la atención preventiva y el bienestar de los adultos mayores.',
        bullets: ['Salud física y nutrición adaptada', 'Bienestar emocional y estimulación cognitiva', 'Seguridad en el hogar y prevención de accidentes', 'Gestión legal, administrativa y previsional']
      }
    ]
  },
  {
    id: 'res-v2',
    title: 'Asesorías Care Experts',
    summary: 'Video orientativo sobre el funcionamiento de las sesiones personalizadas con especialistas en gerontología y trabajo social.',
    category: 'Opciones de cuidado',
    resource_type: 'video',
    read_time_min: 2,
    is_priority: true,
    file_url: null,
    video_url: 'https://youtu.be/mWqy2uipk3c',
    content: [
      {
        heading: 'Modelo de Asesoría Profesional',
        body: 'Explicación del proceso de acompañamiento continuo desde la primera consulta por chat o videollamada.',
        bullets: ['Evaluación gerontológica inicial', 'Elaboración de plan de cuidados a la medida', 'Coordinación con la red de proveedores verificados']
      }
    ]
  },
  {
    id: 'res-course-1',
    title: 'Fundamentos del Cuidado Domiciliario y Prevención de Riesgos',
    summary: 'Curso interactivo por módulos: evaluación del entorno del hogar, prevención de caídas, movilidad segura, ergonomía y plan de emergencias médicas.',
    category: 'Formación',
    resource_type: 'article',
    read_time_min: 25,
    is_priority: true,
    file_url: null,
    video_url: null,
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
    ],
    content: [
      {
        heading: 'Módulo 1: Evaluación del Entorno y Prevención de Caídas',
        body: 'Las caídas representan la principal causa de pérdida de autonomía en personas mayores. Adaptar el entorno doméstico reduce hasta en un 70% los accidentes en el hogar.',
        bullets: [
          'Instala iluminación de encendido automático con sensor en los pasillos que conducen al baño.',
          'Mantén las zonas de paso despejadas y sin alfombras pequeñas sin fijación antideslizante.',
          'Instalar barras de sujeción al costado del WC y dentro de la ducha.'
        ]
      },
      {
        heading: 'Módulo 2: Movilidad Segura y Ergonomía del Cuidador',
        body: 'Al realizar transferencias (de la cama a la silla), mantén siempre las rodillas flexionadas y la espalda recta, utilizando la fuerza de tus piernas para evitar lesiones lumbares.',
        bullets: [
          'Usa calzado cerrado con suela de goma antideslizante tanto para ti como para el familiar.',
          'Asegura siempre los frenos de la silla de ruedas antes de iniciar cualquier movimiento.',
          'Coordinar con la persona el conteo 1, 2, 3 antes de ponerse de pie.'
        ]
      },
      {
        heading: 'Módulo 3: Plan de Emergencias y Ficha Médica Visible',
        body: 'Tener a mano la información clínica condensada ahorra minutos valiosos para los equipos de emergencia médica.',
        bullets: [
          'Mantén una ficha en la puerta del refrigerador con diagnóstico, alergias y medicamentos en uso.',
          'Guarda en la marcación rápida del teléfono los contactos de rescate médico y del médico tratante.',
          'Revisar periódicamente el botiquín de primeros auxilios.'
        ]
      }
    ]
  },
  {
    id: 'res-course-2',
    title: 'Comunicación Asertiva y Gestión del Estrés Familiar',
    summary: 'Taller formativo: manejo empático de cambios de conducta, acuerdos de distribución de tareas y prevención del síndrome del cuidador quemado.',
    category: 'Formación',
    resource_type: 'article',
    read_time_min: 35,
    is_priority: true,
    file_url: null,
    video_url: null,
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
          'Utiliza un canal de mensajería exclusivo para novedades de cuidado y actualización médica.'
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
    ],
    content: [
      {
        heading: 'Módulo 1: Empatía y Comunicación ante Cambios de Conducta',
        body: 'Frente a la rigidez conductual o desorientación, la validación emocional ("Entiendo que te sientas frustrado") es más efectiva que intentar corregir con lógica fría.',
        bullets: [
          'Usa frases breves, tono de voz pausado y mantén contacto visual al comunicarte.',
          'Evita confrontar sobre recuerdos distorsionados; redirige la atención hacia una actividad grata.',
          'Mantener un ambiente tranquilo reduciendo ruidos molestos de fondo.'
        ]
      },
      {
        heading: 'Módulo 2: Distribución Equitativa de Tareas Familiares',
        body: 'El cuidado prolongado no debe recaer en una sola persona. Definir un calendario claro distribuye la carga física y financiera.',
        bullets: [
          'Asigna tareas específicas según las fortalezas de cada familiar (trámites, visitas, compras).',
          'Utiliza un canal de mensajería exclusivo para novedades de cuidado y actualización médica.',
          'Elaborar el calendario mensual de turnos y apoyos.'
        ]
      },
      {
        heading: 'Módulo 3: Prevención del Síndrome del Cuidador Quemado (Burnout)',
        body: 'Cuidar de ti mismo es el primer requisito para cuidar bien a otros. Desconectar periódicamente previene el insomnio y la fatiga crónica.',
        bullets: [
          'Programa al menos 2 horas a la semana dedicadas exclusivamente a tus pasatiempos o descanso.',
          'No dudes en solicitar servicios de reemplazo temporal o voluntariado de apoyo.',
          'Fijar un espacio diario de desconexión sin revisar mensajes de trabajo ni de cuidado.'
        ]
      }
    ]
  },
  {
    id: 'res-course-4',
    title: 'Primeros Auxilios y Manejo de Emergencias Domiciliarias',
    summary: 'Curso formativo: medición de signos vitales, detección temprana de ACV (regla FAST), maniobras de desobstrucción y cuidados de piel frágil.',
    category: 'Formación',
    resource_type: 'article',
    read_time_min: 40,
    is_priority: false,
    file_url: null,
    video_url: null,
    lessons: [
      {
        id: 'l4-1',
        title: 'Módulo 1: Medición de Signos Vitales y Alerta Temprana',
        duration: '15 min',
        summary: 'Uso correcto del tensiómetro, oxímetro y detección de síntomas de ACV.',
        content: 'Aprende a reconocer la regla FAST (Cara caída, Brazo débil, Dificultad para hablar, Tiempo de llamar al 131 de emergencias).',
        tips: [
          'Toma la presión arterial en reposo, tras 5 minutos de estar sentado y en un ambiente tranquilo.',
          'Registra las lecturas en una libreta con fecha y hora para mostrarlas al médico tratante.'
        ],
        checklist: [
          'Tener oxímetro de pulso y tensiómetro digital con baterías cargadas.',
          'Anotar en una libreta las variaciones diarias de signos vitales.'
        ]
      },
      {
        id: 'l4-2',
        title: 'Módulo 2: Maniobras de Heimlich y Cuidado de Piel Frágil',
        duration: '25 min',
        summary: 'Primer auxilio ante atragantamientos y prevención de úlceras por presión.',
        content: 'La piel de las personas mayores es extremadamente delgada. Los cambios de posición cada 2 horas evitan lesiones y úlceras por presión.',
        tips: [
          'Usa cremas hidratantes con ácidos grasos hiperoxigenados para proteger zonas de presión.',
          'En caso de atragantamiento parcial, estimula la tos fuerte sin golpazos en la espalda.'
        ],
        checklist: [
          'Revisar diariamente talones, sacro y codos en busca de zonas enrojecidas.',
          'Tener cojines de alivio de presión en sillas y cama.'
        ]
      }
    ],
    content: [
      {
        heading: 'Módulo 1: Medición de Signos Vitales y Alerta Temprana',
        body: 'Aprende a reconocer la regla FAST (Cara caída, Brazo débil, Dificultad para hablar, Tiempo de llamar al 131 de emergencias).',
        bullets: [
          'Toma la presión arterial en reposo, tras 5 minutos de estar sentado y en un ambiente tranquilo.',
          'Registra las lecturas en una libreta con fecha y hora para mostrarlas al médico tratante.',
          'Tener oxímetro de pulso y tensiómetro digital con baterías cargadas.'
        ]
      },
      {
        heading: 'Módulo 2: Maniobras de Heimlich y Cuidado de Piel Frágil',
        body: 'La piel de las personas mayores es extremadamente delgada. Los cambios de posición cada 2 horas evitan lesiones y úlceras por presión.',
        bullets: [
          'Usa cremas hidratantes con ácidos grasos hiperoxigenados para proteger zonas de presión.',
          'En caso de atragantamiento parcial, estimula la tos fuerte sin golpazos en la espalda.',
          'Revisar diariamente talones, sacro y codos en busca de zonas enrojecidas.'
        ]
      }
    ]
  },
  {
    id: 'res-1',
    title: 'Guía Completa: Cómo evaluar el nivel de dependencia de un familiar',
    summary: 'Aprende a identificar los primeros signos de pérdida de autonomía física y cognitiva en adultos mayores.',
    category: 'Opciones de cuidado',
    resource_type: 'article',
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
        body: 'Detalle sobre los requisitos de postulación al subsidio monetario para cuidadores no remunerados a través de la red de protección del Estado.',
        bullets: [
          'Inscripción en el Registro Social de Hogares con calificación de dependencia.',
          'Acreditación en el CESFAM correspondiente.',
          'ClaveÚnica para postulaciones y consultas en línea.'
        ]
      },
      {
        heading: 'Cobertura en Salud Preventiva y GES/AUGE',
        body: 'Acceso a programas de salud primaria (EMPAM) y atención domiciliaria para personas con dependencia severa.',
        bullets: [
          'Formulario de notificación GES entregado por médico tratante.',
          'Garantía de plazos máximos de atención médica y entrega de medicamentos.'
        ]
      }
    ]
  },
  {
    id: 'res-3',
    title: 'Checklist: Auditoría de Seguridad Domiciliaria para Adultos Mayores',
    summary: 'Lista de verificación práctica para adaptar baños, pasillos y dormitorios evitando caídas y accidentes.',
    category: 'Checklist',
    resource_type: 'article',
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
    resource_type: 'article',
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
  public activeCourse: ResourceItem | null = null;
  public activeLessonIndex = 0;
  public checkedChecklistItems: Record<string, boolean> = {};
  public courseProgressMap: Record<string, number> = {};
  public resources: ResourceItem[] = [];
  public loading = true;
  public error: string | null = null;

  public readonly categories: readonly ResourceCategory[] = [
    'Guías prácticas',
    'Formación',
    'Opciones de cuidado',
    'Financiación',
    'Checklist',
  ] as const;

  constructor(
    public readonly ui: UiService,
    private auth: AuthService,
    private supabase: SupabaseService,
  ) {}

  public get userId(): string | null {
    return this.auth.user?.id ?? null;
  }

  ngOnInit(): void {
    this.loadLocalCourseProgress();
    void this.loadResources();
  }

  private loadLocalCourseProgress(): void {
    try {
      const userKey = this.userId || 'guest';
      const progressKey = `companycare:training:enrollments:${userKey}`;
      const raw = localStorage.getItem(progressKey);
      if (raw) {
        const enrollments = JSON.parse(raw) as Array<{ course_id: string; progress_percent: number }>;
        for (const e of enrollments) {
          if (e.course_id) {
            this.courseProgressMap[e.course_id] = e.progress_percent || 0;
          }
        }
      }

      const checkKey = `companycare:training:checklist:${userKey}`;
      const rawCheck = localStorage.getItem(checkKey);
      if (rawCheck) {
        this.checkedChecklistItems = JSON.parse(rawCheck) as Record<string, boolean>;
      }
    } catch {
      // ignore
    }
  }

  private saveLocalCourseProgress(): void {
    try {
      const userKey = this.userId || 'guest';
      const progressKey = `companycare:training:enrollments:${userKey}`;
      const list = Object.entries(this.courseProgressMap).map(([course_id, progress_percent]) => ({
        course_id,
        progress_percent,
        status: progress_percent >= 100 ? 'completed' : 'enrolled',
        last_accessed_at: new Date().toISOString(),
      }));
      localStorage.setItem(progressKey, JSON.stringify(list));

      const checkKey = `companycare:training:checklist:${userKey}`;
      localStorage.setItem(checkKey, JSON.stringify(this.checkedChecklistItems));
    } catch {
      // ignore
    }
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
      
      const combined = [...loaded];
      const existingIds = new Set(loaded.map((item) => item.id));
      const existingTitles = new Set(loaded.map((item) => item.title?.trim().toLowerCase()));

      for (const fallback of FALLBACK_RESOURCES) {
        if (!existingIds.has(fallback.id) && !existingTitles.has(fallback.title?.trim().toLowerCase())) {
          combined.push(fallback);
        }
      }
      this.resources = combined;
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

  public isCourse(res: ResourceItem): boolean {
    return res.category === 'Formación' || (!!res.lessons && res.lessons.length > 0);
  }

  public getCourseProgress(courseId: string): number {
    return this.courseProgressMap[courseId] ?? 0;
  }

  public open(resource: ResourceItem): void {
    if (this.isCourse(resource)) {
      this.openCourseModal(resource);
      return;
    }
    this.activeResource = resource;
    document.body.style.overflow = 'hidden';
  }

  public openCourseModal(course: ResourceItem): void {
    this.activeCourse = course;
    const lessons = course.lessons ?? [];
    const totalLessons = lessons.length || 1;
    const progress = this.getCourseProgress(course.id);
    const completedLessons = Math.floor((progress / 100) * totalLessons);
    this.activeLessonIndex = Math.min(totalLessons - 1, completedLessons);

    if (progress === 0 && totalLessons > 0) {
      const initialProgress = Math.round(100 / totalLessons);
      this.courseProgressMap[course.id] = initialProgress;
      this.saveLocalCourseProgress();
      void this.syncProgressToSupabase(course.id, initialProgress, 'enrolled');
    }

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
    this.saveLocalCourseProgress();
  }

  public get currentCourseLesson(): CourseLesson | null {
    if (!this.activeCourse || !this.activeCourse.lessons?.length) return null;
    return this.activeCourse.lessons[this.activeLessonIndex] ?? this.activeCourse.lessons[0] ?? null;
  }

  public advanceActiveCourse(): void {
    if (!this.activeCourse) return;
    const lessons = this.activeCourse.lessons ?? [];
    const totalLessons = lessons.length || 1;

    const completedLessonIndex = this.activeLessonIndex;
    if (this.activeLessonIndex < totalLessons - 1) {
      this.activeLessonIndex++;
    }

    const calculatedProgress = Math.min(100, Math.round(((completedLessonIndex + 1) / totalLessons) * 100));
    const currentProgress = this.getCourseProgress(this.activeCourse.id);
    const nextProgress = Math.max(currentProgress, calculatedProgress);

    this.courseProgressMap[this.activeCourse.id] = nextProgress;
    this.saveLocalCourseProgress();

    const status = nextProgress >= 100 ? 'completed' : 'enrolled';
    void this.syncProgressToSupabase(this.activeCourse.id, nextProgress, status);
  }

  private async syncProgressToSupabase(courseId: string, progress: number, status: 'enrolled' | 'completed'): Promise<void> {
    const userId = this.userId;
    if (!userId) return;

    const now = new Date().toISOString();
    try {
      await this.supabase.client.from('training_enrollments').upsert(
        {
          user_id: userId,
          course_id: courseId,
          status: status,
          progress_percent: progress,
          last_accessed_at: now,
        } as any,
        { onConflict: 'user_id,course_id' }
      );
    } catch {
      // Handled via local storage
    }
  }

  public closeDrawer(): void {
    this.activeResource = null;
    document.body.style.overflow = '';
  }

  public getEmbedUrl(videoUrl: string): string {
    const ytMatch = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?/]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`;
    const vmMatch = videoUrl.match(/vimeo\.com\/(\d+)/);
    if (vmMatch) return `https://player.vimeo.com/video/${vmMatch[1]}`;
    return videoUrl;
  }

  public getThumbnail(res: ResourceItem): string {
    if (res.video_url) {
      const ytMatch = res.video_url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?/]+)/);
      if (ytMatch) {
        return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
      }
    }
    return 'assets/img/home-1.jpg';
  }

  public getDurationText(res: ResourceItem): string {
    if (res.id === 'res-v1') return '2:39 min';
    if (res.id === 'res-v2') return '1:53 min';
    return `${res.read_time_min} min`;
  }

  public isDirectVideo(videoUrl: string | null): boolean {
    if (!videoUrl) return false;
    const lower = videoUrl.toLowerCase();
    return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov') || lower.includes('/assets/');
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