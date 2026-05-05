import { Component } from '@angular/core';

@Component({
  selector: 'app-about',
  templateUrl: './about.page.html',
  styleUrls: ['./about.page.scss'],
})
export class AboutPage {
  photoOffsetX = '0px';
  photoOffsetY = '0px';

  onHeroPointerMove(event: MouseEvent): void {
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;

    this.photoOffsetX = `${x * -14}px`;
    this.photoOffsetY = `${y * -10}px`;
  }

  resetHeroParallax(): void {
    this.photoOffsetX = '0px';
    this.photoOffsetY = '0px';
  }
}
