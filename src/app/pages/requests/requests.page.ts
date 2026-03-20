import { Component, OnDestroy, OnInit } from '@angular/core';

import { SupabaseService } from '../../core/services/supabase.service';

type CareRequestRow = {
  id: string;
  channel: string;
  topic: string;
  status: string;
  created_at: string;
};

@Component({
  selector: 'app-requests',
  templateUrl: './requests.page.html',
  styleUrls: ['./requests.page.scss'],
})
export class RequestsPage implements OnInit, OnDestroy {
  public loading = true;
  public error: string | null = null;
  public items: CareRequestRow[] = [];

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

    const { data: sessionData, error: sessionError } = await this.supabase.client.auth.getSession();
    if (sessionError) {
      this.loading = false;
      this.error = sessionError.message;
      return;
    }

    const userId = sessionData.session?.user?.id;
    if (!userId) {
      this.loading = false;
      this.items = [];
      return;
    }

    const { data, error } = await this.supabase.client
      .from('care_requests')
      .select('id, channel, topic, status, created_at')
      .eq('employee_id', userId)
      .order('created_at', { ascending: false });

    this.loading = false;
    if (error) {
      this.error = error.message;
      return;
    }

    this.items = (data ?? []) as CareRequestRow[];
  }
}

