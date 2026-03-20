import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss'],
})
export class ResetPasswordPage {
  public password = '';
  public confirmPassword = '';
  public loading = false;
  public error: string | null = null;
  public success: string | null = null;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly router: Router
  ) {}

  public async submit(): Promise<void> {
    this.error = null;
    this.success = null;
    this.loading = true;

    try {
      if (!this.password) throw new Error('Ingresa una nueva contraseña.');
      if (this.password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
      if (this.password !== this.confirmPassword) throw new Error('Las contraseñas no coinciden.');

      const { data } = await this.supabase.client.auth.getSession();
      if (!data.session) throw new Error('Abre este link desde tu email para continuar.');

      const { error } = await this.supabase.client.auth.updateUser({ password: this.password });
      if (error) throw error;

      this.success = 'Contraseña actualizada.';
      await this.router.navigateByUrl('/dashboard');
    } catch (e: any) {
      this.error = e?.message ?? 'No se pudo actualizar la contraseña.';
    } finally {
      this.loading = false;
    }
  }
}

