import { Component, OnDestroy, OnInit } from '@angular/core';

import { SupabaseService } from '../../core/services/supabase.service';

type VoucherRow = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  discount_type: string;
  discount_value: number | null;
  currency: string;
  active: boolean;
};

@Component({
  selector: 'app-vouchers',
  templateUrl: './vouchers.page.html',
  styleUrls: ['./vouchers.page.scss'],
})
export class VouchersPage implements OnInit, OnDestroy {
  public loading = true;
  public error: string | null = null;
  public items: VoucherRow[] = [];

  private unsub?: { data: { subscription: { unsubscribe: () => void } } };

  constructor(private readonly supabase: SupabaseService) {}

  public ngOnInit(): void {
    void this.refresh();
    this.unsub = this.supabase.client.auth.onAuthStateChange(() => void this.refresh());
  }

  public ngOnDestroy(): void {
    this.unsub?.data.subscription.unsubscribe();
  }

  public async refresh(): Promise<void> {
    this.loading = true;
    this.error = null;

    const { data: sessionData } = await this.supabase.client.auth.getSession();
    if (!sessionData.session) {
      this.loading = false;
      this.items = [];
      return;
    }

    const { data, error } = await this.supabase.client
      .from('vouchers')
      .select('id, code, title, description, discount_type, discount_value, currency, active')
      .eq('active', true)
      .order('title', { ascending: true });

    this.loading = false;
    if (error) {
      this.error = error.message;
      return;
    }

    this.items = (data ?? []) as VoucherRow[];
  }
}

