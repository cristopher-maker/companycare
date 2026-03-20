import { Component } from '@angular/core';

type ServiceItem = { title: string; description: string };

@Component({
  selector: 'app-services',
  templateUrl: './services.page.html',
  styleUrls: ['./services.page.scss'],
})
export class ServicesPage {
  public readonly services: ServiceItem[] = [
    {
      title: 'Asesoría estratégica',
      description: 'Diagnóstico, plan de acción y acompañamiento.',
    },
    {
      title: 'Optimización de procesos',
      description: 'Mejoras concretas con foco en resultados medibles.',
    },
    {
      title: 'Gestión y seguimiento',
      description: 'Indicadores, reportes y continuidad operativa.',
    },
  ];
}

