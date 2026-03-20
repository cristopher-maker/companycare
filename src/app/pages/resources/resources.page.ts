import { Component } from '@angular/core';

type ResourceCategory = 'Opciones de cuidado' | 'Financiación' | 'Checklist' | 'Guías prácticas';

type ResourceItem = {
  id: string;
  title: string;
  category: ResourceCategory;
  summary: string;
  isPriority?: boolean;
};

@Component({
  selector: 'app-resources',
  templateUrl: './resources.page.html',
  styleUrls: ['./resources.page.scss'],
})
export class ResourcesPage {
  public selectedCategory: 'Todos' | ResourceCategory = 'Todos';

  public readonly categories: readonly ResourceCategory[] = [
    'Opciones de cuidado',
    'Financiación',
    'Checklist',
    'Guías prácticas',
  ] as const;

  public readonly resources: ResourceItem[] = [
    {
      id: 'r1',
      title: 'Cómo elegir entre residencia vs. cuidado a domicilio',
      category: 'Opciones de cuidado',
      summary: 'Factores clave: autonomía, red de apoyo, presupuesto y tiempos.',
    },
    {
      id: 'r2',
      title: 'Guía rápida de financiación (subsidios, seguros y copagos)',
      category: 'Financiación',
      summary: 'Mapa de alternativas y documentos típicos para postular.',
      isPriority: true,
    },
    {
      id: 'r3',
      title: 'Checklist para la primera evaluación de necesidades',
      category: 'Checklist',
      summary: 'Preguntas y señales de alerta para priorizar apoyos.',
    },
    {
      id: 'r4',
      title: 'Comunicación familiar: acuerdos y límites',
      category: 'Guías prácticas',
      summary: 'Cómo repartir tareas y mantener conversaciones difíciles.',
    },
  ];

  public get filteredResources(): ResourceItem[] {
    if (this.selectedCategory === 'Todos') return this.resources;
    return this.resources.filter((r) => r.category === this.selectedCategory);
  }

  public setCategory(category: 'Todos' | ResourceCategory): void {
    this.selectedCategory = category;
  }

  public trackById(_: number, r: ResourceItem): string {
    return r.id;
  }

  public trackByCat(_: number, c: ResourceCategory): string {
    return c;
  }

  // El código permanece casi igual, solo asegúrate de que los iconos 
// sean consistentes. Por ejemplo, quité el "-outline" para que 
// los iconos tengan más peso visual dentro de las cards.

public categoryIcon(category: ResourceCategory): string {
  switch (category) {
    case 'Opciones de cuidado': return 'home';
    case 'Financiación': return 'wallet';
    case 'Checklist': return 'checkbox';
    case 'Guías prácticas': return 'library';
    default: return 'document';
  }
}
  public categoryClass(category: ResourceCategory): string {
    switch (category) {
      case 'Opciones de cuidado':
        return 'is-care';
      case 'Financiación':
        return 'is-finance';
      case 'Checklist':
        return 'is-checklist';
      case 'Guías prácticas':
        return 'is-guides';
    }
  }

  public open(resource: ResourceItem): void {
    // Placeholder: navegar a detalle / abrir link externo.
    alert(`Abrir (demo): ${resource.title}`);
  }
}

