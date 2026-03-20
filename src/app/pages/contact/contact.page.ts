import { Component } from '@angular/core';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.page.html',
  styleUrls: ['./contact.page.scss'],
})
export class ContactPage {
  public name = '';
  public email = '';
  public message = '';

  public submit(): void {
    // Placeholder: aquí puedes integrar email, WhatsApp, Supabase, etc.
    alert('Mensaje enviado (demo).');
    this.name = '';
    this.email = '';
    this.message = '';
  }
}

