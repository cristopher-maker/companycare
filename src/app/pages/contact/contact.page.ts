import { Component, OnDestroy, OnInit } from '@angular/core';

import { SupabaseService } from '../../core/services/supabase.service';

type ContactMode = 'public' | 'employee' | 'company';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.page.html',
  styleUrls: ['./contact.page.scss'],
})
export class ContactPage implements OnInit, OnDestroy {
  public mode: ContactMode = 'public';
  public canStartCareFlow = false;
  public fullName = '';
  public workEmail = '';
  public company = '';
  public phone = '';
  public department = '';
  public message = '';
  private unsub?: { data: { subscription: { unsubscribe: () => void } } };

  public readonly departments = [
    'Recursos Humanos',
    'People & Culture',
    'Beneficios',
    'Operaciones',
    'Gerencia',
    'Otro',
  ];

  constructor(private readonly supabase: SupabaseService) {}

  public ngOnInit(): void {
    void this.refresh();
    this.unsub = this.supabase.client.auth.onAuthStateChange(() => void this.refresh());
  }

  public ngOnDestroy(): void {
    this.unsub?.data.subscription.unsubscribe();
  }

  public submit(): void {
    // Placeholder: aquí puedes integrar email, WhatsApp, Supabase, etc.
    alert('Mensaje enviado (demo).');
    this.fullName = '';
    this.workEmail = '';
    this.company = '';
    this.phone = '';
    this.department = '';
    this.message = '';
  }

  private async refresh(): Promise<void> {
    const { data: sessionData } = await this.supabase.client.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      this.mode = 'public';
      this.canStartCareFlow = false;
      return;
    }

    const { data: profile } = await this.supabase.client
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const role = (profile?.role ?? 'employee') as string;

    if (role === 'admin' || role === 'company_admin' || role === 'manager') {
      this.mode = 'company';
      this.canStartCareFlow = role === 'admin';
      return;
    }

    this.mode = 'employee';
    this.canStartCareFlow = true;
  }
}
