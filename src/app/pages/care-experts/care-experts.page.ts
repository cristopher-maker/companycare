import { Component } from '@angular/core';

type SupportChannel = 'Chat' | 'Videollamada' | 'Llamada';

@Component({
  selector: 'app-care-experts',
  templateUrl: './care-experts.page.html',
  styleUrls: ['./care-experts.page.scss'],
})
export class CareExpertsPage {
  public channel: SupportChannel = 'Chat';
  public topic = 'Orientación general';
  public details = '';

  public readonly topics = [
    'Orientación general',
    'Evaluación de necesidades',
    'Residencias y opciones',
    'Cuidados a domicilio',
    'Apoyo emocional y estrés',
    'Beneficios y financiación',
  ] as const;

  public submitRequest(): void {
    // Placeholder: conectar a backend / ticketing / chat real.
    alert('Solicitud enviada (demo). Un Care Expert te contactará pronto.');
    this.details = '';
  }
}

