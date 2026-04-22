import { Component } from '@angular/core';

type ServiceHighlight = {
  title: string;
  description: string;
  deliverables: string[];
  accent: 'blue' | 'violet' | 'green';
  icon: string;
};

@Component({
  selector: 'app-services',
  templateUrl: './services.page.html',
  styleUrls: ['./services.page.scss'],
})
export class ServicesPage {
  public readonly serviceHighlights: ServiceHighlight[] = [
    {
      title: 'Asesoria estrategica',
      description: 'Diagnostico inicial, definicion de brechas y acompanamiento para priorizar decisiones.',
      deliverables: [
        'Levantamiento de situacion actual',
        'Identificacion de brechas y oportunidades',
        'Hoja de ruta con prioridades claras',
      ],
      accent: 'blue',
      icon: 'compass-outline',
    },
    {
      title: 'Optimizacion de procesos',
      description: 'Mejoras concretas para ordenar la operacion, reducir fricciones y aumentar eficiencia.',
      deliverables: [
        'Revision de flujos y cuellos de botella',
        'Rediseno de procesos clave',
        'Acciones con foco en resultados medibles',
      ],
      accent: 'violet',
      icon: 'git-merge-outline',
    },
    {
      title: 'Gestion y seguimiento',
      description: 'Indicadores, reportes y continuidad operativa para sostener los avances en el tiempo.',
      deliverables: [
        'Definicion de KPIs y tableros',
        'Reportes periodicos de avance',
        'Ajustes y seguimiento de implementacion',
      ],
      accent: 'green',
      icon: 'pulse-outline',
    },
  ];

  public readonly workSteps = [
    {
      step: '01',
      title: 'Diagnostico',
      text: 'Analizamos contexto, procesos actuales y necesidades prioritarias.',
    },
    {
      step: '02',
      title: 'Plan de accion',
      text: 'Definimos acciones, responsables, plazos y metas realistas.',
    },
    {
      step: '03',
      title: 'Acompanamiento',
      text: 'Monitoreamos avances, reportamos resultados y ajustamos cuando hace falta.',
    },
  ];
}
