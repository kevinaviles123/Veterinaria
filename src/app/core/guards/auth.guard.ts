import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../services/session.service';

export const authGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const router = inject(Router);
  if (session.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/ingresar']);
};

export const guestGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const router = inject(Router);
  if (!session.isAuthenticated()) {
    return true;
  }
  const role = session.role();
  if (role === 'admin') {
    return router.createUrlTree(['/app/admin']);
  }
  if (role === 'vet') {
    return router.createUrlTree(['/app/vet']);
  }
  return router.createUrlTree(['/app/inicio']);
};

export const roleGuard =
  (roles: Array<'admin' | 'owner' | 'vet'>): CanActivateFn =>
  () => {
    const session = inject(SessionService);
    const router = inject(Router);
    const role = session.role();
    if (role && (roles as string[]).includes(role)) {
      return true;
    }
    return router.createUrlTree(['/app/inicio']);
  };
