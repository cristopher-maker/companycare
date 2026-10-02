import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService, ProfileRole } from '../../core/services/auth.service';
import { UiService } from '../../core/services/ui.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { WhatsAppBotService } from '../../core/services/whatsapp-bot.service';

export type ProfileTab = 'personal' | 'security' | 'preferences' | 'organization';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
})
export class ProfilePage implements OnInit {
  public loading = true;
  public saving = false;
  public savingPassword = false;

  public activeTab: ProfileTab = 'personal';

  // Personal Info
  public fullName = '';
  public email = '';
  public phone = '';
  public jobTitle = '';
  public company = '';
  public companyTaxId = '';
  public role: ProfileRole | null = null;
  public selectedColor = '#0284c7';

  // Available Avatar Colors
  public readonly avatarColors = [
    { name: 'Azul Océano', hex: '#0284c7' },
    { name: 'Índigo Real', hex: '#4f46e5' },
    { name: 'Verde Esmeralda', hex: '#059669' },
    { name: 'Ámbar Cálido', hex: '#d97706' },
    { name: 'Coral / Rosa', hex: '#e11d48' },
    { name: 'Púrpura', hex: '#7c3aed' },
  ];

  // Direct Password Update
  public newPassword = '';
  public confirmPassword = '';
  public showPasswords = false;

  // Preferences
  public notificationEmail = true;
  public notificationWhatsapp = true;
  public notificationSound = true;

  // n8n Webhook Configuration
  public n8nWebhookUrl = '';
  public testPhone = '';
  public testEmail = '';
  public testingWebhook = false;
  public testResult: { success: boolean; message: string } | null = null;

  // Active Sessions
  public activeSessions: Array<{ device: string; detail: string; icon: string; current: boolean }> = [];

  // Feedback Toast
  public toastMsg: { text: string; type: 'success' | 'error' | 'info' } | null = null;
  private toastTimer: any = null;

  constructor(
    public readonly auth: AuthService,
    private readonly supabase: SupabaseService,
    private readonly router: Router,
    public readonly ui: UiService,
    public readonly whatsappBot: WhatsAppBotService
  ) {}

  public async ngOnInit(): Promise<void> {
    await this.loadProfile();
  }

  public roleLabel(value: ProfileRole | null): string {
    switch (value) {
      case 'admin':
        return 'Administrador Global';
      case 'company_admin':
        return 'Administrador Residencia / Empresa';
      case 'manager':
        return 'Supervisor / Manager';
      case 'care_expert':
        return 'Especialista Care Expert';
      case 'employee':
        return 'Colaborador / Familiar';
      default:
        return 'Usuario';
    }
  }

  public get roleBadgeColor(): string {
    switch (this.role) {
      case 'admin':
        return '#0284c7';
      case 'care_expert':
        return '#059669';
      case 'company_admin':
      case 'manager':
        return '#7c3aed';
      default:
        return '#475569';
    }
  }

  public get initials(): string {
    const name = (this.fullName || this.email || 'U').trim();
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  public showToast(text: string, type: 'success' | 'error' | 'info' = 'success'): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastMsg = { text, type };
    this.toastTimer = setTimeout(() => {
      this.toastMsg = null;
    }, 4000);
  }

  public async savePersonal(): Promise<void> {
    const userId = this.auth.user?.id;
    if (!userId) {
      await this.router.navigateByUrl('/login');
      return;
    }

    this.saving = true;
    try {
      // 1. Update in profiles table
      const { error: profileErr } = await this.supabase.client
        .from('profiles')
        .update({
          full_name: this.fullName.trim() || null,
          company: this.company.trim() || null,
        } as any)
        .eq('id', userId);

      if (profileErr) throw profileErr;

      // 2. Update user_metadata in Supabase Auth
      await this.supabase.client.auth.updateUser({
        data: {
          full_name: this.fullName.trim(),
          phone: this.phone.trim(),
          job_title: this.jobTitle.trim(),
          avatar_color: this.selectedColor
        }
      });

      // 3. Local fallback cache
      localStorage.setItem('cc_profile_phone', this.phone.trim());
      localStorage.setItem('cc_profile_job_title', this.jobTitle.trim());
      localStorage.setItem('cc_profile_avatar_color', this.selectedColor);

      this.showToast('Tus datos personales han sido actualizados con éxito.', 'success');
    } catch (err: any) {
      this.showToast(err?.message ?? 'No se pudo guardar el perfil.', 'error');
    } finally {
      this.saving = false;
    }
  }

  public async updatePasswordDirect(): Promise<void> {
    if (!this.newPassword || this.newPassword.length < 6) {
      this.showToast('La nueva contraseña debe tener al menos 6 caracteres.', 'error');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.showToast('Las contraseñas ingresadas no coinciden.', 'error');
      return;
    }

    this.savingPassword = true;
    try {
      await this.auth.updateUserPassword(this.newPassword);
      this.newPassword = '';
      this.confirmPassword = '';
      this.showToast('Tu contraseña se ha actualizado correctamente.', 'success');
    } catch (err: any) {
      this.showToast(err?.message ?? 'Error al actualizar contraseña.', 'error');
    } finally {
      this.savingPassword = false;
    }
  }

  public async sendResetPassword(): Promise<void> {
    const email = this.email.trim();
    if (!email) return;

    try {
      const redirectTo = `${window.location.origin}/#/reset-password`;
      await this.auth.sendPasswordReset(email, redirectTo);
      this.showToast('Te hemos enviado un correo seguro para restablecer tu contraseña.', 'info');
    } catch (err: any) {
      this.showToast(err?.message ?? 'No se pudo enviar el correo de recuperación.', 'error');
    }
  }

  public savePreferences(): void {
    const payload = {
      email: this.notificationEmail,
      whatsapp: this.notificationWhatsapp,
      sound: this.notificationSound,
    };
    localStorage.setItem('cc_profile_notifications', JSON.stringify(payload));
    this.saveWebhookUrl();
    this.showToast('Preferencias guardadas correctamente.', 'success');
  }

  public saveWebhookUrl(): void {
    this.whatsappBot.setWebhookUrl(this.n8nWebhookUrl);
  }

  public async testN8nConnection(): Promise<void> {
    const url = this.n8nWebhookUrl.trim();
    if (!url) {
      this.testResult = {
        success: false,
        message: 'Ingresa primero la URL de tu Webhook en n8n.'
      };
      return;
    }

    const targetEmail = this.testEmail.trim() || this.email.trim();
    const targetPhone = this.testPhone.trim() || this.phone.trim();

    if (!targetEmail && !targetPhone) {
      this.testResult = {
        success: false,
        message: 'Ingresa un correo o un número de celular para recibir la prueba.'
      };
      return;
    }

    this.saveWebhookUrl();
    this.testingWebhook = true;
    this.testResult = null;

    try {
      const result = await this.whatsappBot.sendNotification({
        email: targetEmail,
        phone: targetPhone,
        subject: '✅ Prueba de Conexión Exitosa - Company Care',
        message: `¡Hola ${this.fullName || 'Admin'}!\n\nTu bot y automatización en n8n están correctamente conectados con Company Care.\n\nYa puedes recibir alertas médicas, avisos de citas y reportes de estado directamente en tu bandeja de entrada de Gmail o WhatsApp.`,
        event: 'test_connection',
        recipientName: this.fullName || 'Admin',
        senderName: 'Company Care Bot'
      });

      this.testResult = result;
      if (result.success) {
        this.showToast('¡Prueba enviada a n8n con éxito! Revisa tu Gmail / WhatsApp.', 'success');
      } else {
        this.showToast(result.message, 'error');
      }
    } catch (err: any) {
      this.testResult = {
        success: false,
        message: err?.message || 'Error inesperado al conectar con n8n.'
      };
    } finally {
      this.testingWebhook = false;
    }
  }

  private async loadProfile(): Promise<void> {
    const userId = this.auth.user?.id;
    if (!userId) {
      this.loading = false;
      await this.router.navigateByUrl('/login');
      return;
    }

    this.loading = true;
    try {
      const { data, error } = await this.supabase.client
        .from('profiles')
        .select('full_name, email, company, role')
        .eq('id', userId)
        .maybeSingle();

      if (error) console.warn('Aviso al cargar perfil:', error);

      this.fullName = (data?.full_name as string | undefined) ?? '';
      this.email = (data?.email as string | undefined) ?? this.auth.user?.email ?? '';
      this.company = (data?.company as string | undefined) ?? '';
      this.role = ((data?.role as ProfileRole | undefined) ?? null);

      // Metadata & Local Preferences
      const meta = this.auth.user?.user_metadata || {};
      this.phone = meta['phone'] || localStorage.getItem('cc_profile_phone') || '';
      this.jobTitle = meta['job_title'] || localStorage.getItem('cc_profile_job_title') || '';
      this.selectedColor = meta['avatar_color'] || localStorage.getItem('cc_profile_avatar_color') || '#0284c7';

      const savedNotifs = localStorage.getItem('cc_profile_notifications');
      if (savedNotifs) {
        try {
          const parsed = JSON.parse(savedNotifs);
          this.notificationEmail = parsed.email ?? true;
          this.notificationWhatsapp = parsed.whatsapp ?? true;
          this.notificationSound = parsed.sound ?? true;
        } catch {
          // ignore
        }
      }

      this.n8nWebhookUrl = this.whatsappBot.getWebhookUrl();
      this.testPhone = this.phone || '';
      this.testEmail = this.email || '';

      // Company info
      const { data: membership } = await this.supabase.client
        .from('company_members')
        .select('company_id')
        .eq('user_id', userId)
        .maybeSingle();

      const companyId = (membership?.company_id as string | undefined) ?? null;
      if (companyId) {
        const { data: companyData } = await this.supabase.client
          .from('companies')
          .select('name, tax_id')
          .eq('id', companyId)
          .maybeSingle();

        if (companyData?.name && !this.company) {
          this.company = companyData.name as string;
        }
        this.companyTaxId = (companyData?.tax_id as string | undefined) ?? '';
      } else {
        this.companyTaxId = '';
      }

      await this.loadCurrentSession();
    } finally {
      this.loading = false;
    }
  }

  private async loadCurrentSession(): Promise<void> {
    const { data } = await this.supabase.client.auth.getSession();
    const session = data.session;
    const userAgent = navigator.userAgent;
    const browser = this.detectBrowser(userAgent);
    const os = this.detectOs(userAgent);
    const loginDate = session?.user?.last_sign_in_at ? new Date(session.user.last_sign_in_at) : null;

    this.activeSessions = [{
      device: `${browser} · ${os}`,
      detail: loginDate ? `Último ingreso: ${loginDate.toLocaleString('es-CL')}` : 'Sesión activa ahora',
      icon: this.isMobileUserAgent(userAgent) ? 'smartphone' : 'laptop',
      current: true
    }];
  }

  private detectBrowser(userAgent: string): string {
    if (/Edg\//.test(userAgent)) return 'Microsoft Edge';
    if (/OPR\//.test(userAgent)) return 'Opera';
    if (/Chrome\//.test(userAgent)) return 'Google Chrome';
    if (/Safari\//.test(userAgent) && !/Chrome\//.test(userAgent)) return 'Apple Safari';
    if (/Firefox\//.test(userAgent)) return 'Mozilla Firefox';
    return 'Navegador Web';
  }

  private detectOs(userAgent: string): string {
    if (/Windows/i.test(userAgent)) return 'Windows';
    if (/Mac OS X/i.test(userAgent)) return 'macOS';
    if (/Android/i.test(userAgent)) return 'Android';
    if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS';
    if (/Linux/i.test(userAgent)) return 'Linux';
    return 'Dispositivo';
  }

  private isMobileUserAgent(userAgent: string): boolean {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
  }
}
