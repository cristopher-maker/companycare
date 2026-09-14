import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlTree } from '@angular/router';

import { SupabaseService } from '../services/supabase.service';

export const authGuard: CanMatchFn = async (_route, segments): Promise<boolean | UrlTree> => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  // Use getUser() instead of getSession() to verify the token server-side,
  // ensuring revoked/banned users cannot bypass authentication with cached sessions.
  const { data, error } = await supabase.client.auth.getUser();
  if (error || !data.user) {
    const returnUrl = '/' + segments.map((s) => s.path).join('/');
    return router.createUrlTree(['/login'], { queryParams: { returnUrl } });
  }

  return true;
};
