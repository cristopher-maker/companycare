import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
 
import { SiteHeaderComponent } from '../../shared/components/site-header/site-header.component';
import { SiteFooterComponent } from '../../shared/components/site-footer/site-footer.component';
 
// ── Interfaces ────────────────────────────────────────────────────────────────
 
export interface ServiceMetric {
  value: string;
  label: string;
}
 
export interface ServiceHighlight {
  title: string;
  description: string;
  icon: string;
  accent: 'blue' | 'green' | 'amber';
  deliverables: string[];
}
 
export interface WorkStep {
  step: string;
  title: string;
  text: string;
}
 
// ── Data constants ────────────────────────────────────────────────────────────
 
const SERVICE_METRICS: ServiceMetric[] = [
  { value: '24+', label: 'tareas completadas por ciclo' },
  { value: '8', label: 'casos activos con seguimiento' },
  { value: '1/mes', label: 'reporte ejecutivo' },
];
 
const SERVICE_HIGHLIGHTS: ServiceHighlight[] = [
  {
    title: 'Diagnóstico y plan de acción',
    description: 'Evaluamos la situación actual y construimos una hoja de ruta con prioridades reales.',
    icon: 'analytics',
    accent: 'blue',
    deliverables: [
      'Mapeo de necesidades',
      'Plan trimestral priorizado',
      'Definición de indicadores',
    ],
  },
  {
    title: 'Acompañamiento y seguimiento',
    description: 'Aterrizamos el plan con reuniones, ajustes de criterio y visibilidad continua.',
    icon: 'hub',
    accent: 'green',
    deliverables: [
      'Reuniones quincenales',
      'Dashboard de seguimiento',
      'Reportes mensuales',
    ],
  },
  {
    title: 'Formación y cultura',
    description: 'Capacitamos a líderes y equipos para que el cuidado no dependa solo de buena voluntad.',
    icon: 'school',
    accent: 'amber',
    deliverables: [
      'Talleres para líderes',
      'Webinars para empleados',
      'Material de comunicación',
    ],
  },
];
 
const WORK_STEPS: WorkStep[] = [
  { step: '01', title: 'Diagnóstico',   text: 'Entendemos el contexto, los dolores y las prioridades reales.' },
  { step: '02', title: 'Planificación', text: 'Co-creamos un plan de acción con hitos, responsables y orden.' },
  { step: '03', title: 'Ejecución',     text: 'Acompañamos la implementación y medimos el progreso visible.' },
  { step: '04', title: 'Optimización',  text: 'Ajustamos la ruta usando datos, feedback y aprendizaje continuo.' },
];
 
// ── Component ─────────────────────────────────────────────────────────────────
 
@Component({
  selector: 'app-services',
  templateUrl: './services.page.html',
  styleUrls: ['./services.page.scss'],
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, SiteHeaderComponent, SiteFooterComponent],
})
export class ServicesPage {
  readonly serviceMetrics    = SERVICE_METRICS;
  readonly serviceHighlights = SERVICE_HIGHLIGHTS;
  readonly workSteps         = WORK_STEPS;
 
  trackByLabel(_: number, item: ServiceMetric): string    { return item.label; }
  trackByTitle(_: number, item: ServiceHighlight): string { return item.title; }
  trackByStep (_: number, item: WorkStep): string         { return item.step;  }
}