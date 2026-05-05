import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.page.html',
  styleUrls: ['./contact.page.scss'],
})
export class ContactPage {
  public form: FormGroup;
  public loading = false;
  public error: string | null = null;
  public success: string | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly supabase: SupabaseService
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      company: [''],
      message: ['', Validators.required],
    });
  }

  public async submit(): Promise<void> {
    if (this.form.invalid) {
      this.error = 'Por favor, completa todos los campos requeridos.';
      return;
    }

    this.loading = true;
    this.error = null;
    this.success = null;

    // Placeholder for actual submission logic
    console.log('Form submitted:', this.form.value);
    this.success = 'Gracias por tu mensaje. Te contactaremos pronto.';
    this.form.reset();
    this.loading = false;
  }
}
