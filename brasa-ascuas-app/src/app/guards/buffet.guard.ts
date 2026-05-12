import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../services/session';

export const buffetGuard: CanActivateFn = () => {
  const router = inject(Router);
  const sessionService = inject(SessionService);
  const session = sessionService.current;

  if (!session) {
    router.navigateByUrl('/login');
    return false;
  }
  if (!session.buffet) {
    router.navigateByUrl('/choose-buffet');
    return false;
  }
  return true;
};
