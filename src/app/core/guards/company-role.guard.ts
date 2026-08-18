import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlTree } from '@angular/router';

import { SupabaseService } from '../services/supabase.service';

/**
 * Guard that restricts access to company-level management pages
 * (e.g. company dashboard, case monitoring).
 * Allowed roles: company_admin, hr_admin, manager, admin.
 */
export const companyRoleGuard: CanMatchFn = async (): Promise<boolean | UrlTree> => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  const { data: userData } = await supabase.client.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return router.createUrlTree(['/login']);

  const { data: profile, error } = await supabase.client
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (error || !profile?.role) {
    return router.createUrlTree(['/home']);
  }

  const allowedRoles = new Set(['company_admin', 'hr_admin', 'manager', 'admin']);
  if (!allowedRoles.has(profile.role)) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};
