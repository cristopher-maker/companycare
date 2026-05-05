﻿﻿import { Component } from '@angular/core';

import { SupabaseService } from '../../core/services/supabase.service';
import { UiService } from '../../core/services/ui.service';

type HomeMode = 'public' | 'employee' | 'company';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage {
  constructor(
    private readonly supabase: SupabaseService,
    public readonly ui: UiService
  ) {}
}
