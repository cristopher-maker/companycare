import { Component } from '@angular/core';

type ProviderType = 'Residencia' | 'Cuidador a domicilio' | 'Servicio médico';
type Availability = 'Hoy' | 'Esta semana' | 'Sin cupo';

type Provider = {
  id: string;
  name: string;
  type: ProviderType;
  area: string;
  priceFrom: number;
  rating: number;
  availability: Availability;
  verified: boolean;
};

@Component({
  selector: 'app-providers',
  templateUrl: './providers.page.html',
  styleUrls: ['./providers.page.scss'],
})
export class ProvidersPage {
  public q = '';
  public type: ProviderType | 'Todos' = 'Todos';
  public verifiedOnly = true;
  public maxPrice = 1200000;

  public readonly types: ProviderType[] = ['Residencia', 'Cuidador a domicilio', 'Servicio médico'];

  private readonly allProviders: Provider[] = [
    {
      id: 'p1',
      name: 'Residencia Los Arrayanes',
      type: 'Residencia',
      area: 'Santiago',
      priceFrom: 950000,
      rating: 4.6,
      availability: 'Esta semana',
      verified: true,
    },
    {
      id: 'p2',
      name: 'Cuidadores Casa & Vida',
      type: 'Cuidador a domicilio',
      area: 'Providencia',
      priceFrom: 18000,
      rating: 4.4,
      availability: 'Hoy',
      verified: true,
    },
    {
      id: 'p3',
      name: 'Atención Médica Móvil',
      type: 'Servicio médico',
      area: 'La Florida',
      priceFrom: 35000,
      rating: 4.2,
      availability: 'Hoy',
      verified: false,
    },
    {
      id: 'p4',
      name: 'Residencia Buen Descanso',
      type: 'Residencia',
      area: 'Ñuñoa',
      priceFrom: 1100000,
      rating: 4.1,
      availability: 'Sin cupo',
      verified: true,
    },
  ];

  public get providers(): Provider[] {
    const query = this.q.trim().toLowerCase();

    return this.allProviders
      .filter((p) => (this.type === 'Todos' ? true : p.type === this.type))
      .filter((p) => (this.verifiedOnly ? p.verified : true))
      .filter((p) => p.priceFrom <= this.maxPrice)
      .filter((p) => {
        if (!query) return true;
        return `${p.name} ${p.type} ${p.area}`.toLowerCase().includes(query);
      })
      .sort((a, b) => b.rating - a.rating);
  }

  public trackById(_: number, p: Provider): string {
    return p.id;
  }
}

