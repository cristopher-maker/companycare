import { Component, ElementRef, OnDestroy, OnInit, ViewChild, AfterViewInit, Renderer2 } from '@angular/core';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.page.html',
  styleUrls: ['./contact.page.scss'],
})
export class ContactPage implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('lavaCanvas') private lavaCanvasRef?: ElementRef<HTMLCanvasElement>;
  
  private animationId: number | null = null;
  public mode: 'public' | 'company' = 'public'; // Según tu lógica de Supabase

  constructor(private readonly renderer: Renderer2) {}

  ngOnInit() {
    this.renderer.addClass(document.body, 'dark-page-active');
    this.loadHubSpot();
  }

  ngAfterViewInit() {
    this.initLava();
  }

  ngOnDestroy() {
    this.renderer.removeClass(document.body, 'dark-page-active');
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }

  private loadHubSpot() {
    if (!document.getElementById('hs-script')) {
      const script = document.createElement('script');
      script.id = 'hs-script';
      script.src = 'https://js.hsforms.net/forms/embed/51191982.js';
      script.defer = true;
      document.head.appendChild(script);
    }
  }

  private initLava() {
    const canvas = this.lavaCanvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const blobs = Array.from({ length: 9 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 80 + Math.random() * 120,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.5,
      hue: Math.random() < 0.5 ? 280 + Math.random() * 30 : 310 + Math.random() * 30,
      phase: Math.random() * Math.PI * 2,
      speed: 0.003 + Math.random() * 0.004
    }));

    const draw = () => {
      // Dibuja un gradiente sutil en lugar de un color sólido
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#1a0a2e'); // Púrpura oscuro (arriba)
      gradient.addColorStop(1, '#3c103f'); // Magenta oscuro (abajo)
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      blobs.forEach(b => {
        b.phase += b.speed;
        b.x += b.vx + Math.sin(b.phase * 0.7) * 0.3;
        b.y += b.vy + Math.cos(b.phase * 0.5) * 0.4;

        if (b.x < -b.r) b.x = canvas.width + b.r;
        if (b.x > canvas.width + b.r) b.x = -b.r;
        if (b.y < -b.r) b.y = canvas.height + b.r;
        if (b.y > canvas.height + b.r) b.y = -b.r;

        const pulse = 1 + 0.18 * Math.sin(b.phase * 1.3);
        const gr = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * pulse);
        gr.addColorStop(0, `hsla(${b.hue}, 100%, 65%, 0.55)`);
        gr.addColorStop(0.5, `hsla(${b.hue + 15}, 90%, 55%, 0.25)`);
        gr.addColorStop(1, `hsla(${b.hue + 30}, 80%, 45%, 0)`);

        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * pulse, 0, Math.PI * 2);
        ctx.fillStyle = gr;
        ctx.fill();
      });
      this.animationId = requestAnimationFrame(draw);
    };
    draw();
  }
}