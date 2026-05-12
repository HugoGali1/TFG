import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  if (!auth.isLoggedIn()) {
    router.navigateByUrl('/login');
    return false;
  }
  if (auth.getRole() !== 'admin') {
    router.navigateByUrl('/kitchen');
    return false;
  }
  return true;
};
