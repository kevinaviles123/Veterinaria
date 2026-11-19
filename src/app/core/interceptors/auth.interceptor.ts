import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SessionService } from '../services/session.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionService);
  const current = session.valid();
  if (!current || !req.url.startsWith('/api/')) {
    return next(req);
  }
  return next(
    req.clone({
      setHeaders: {
        Authorization: `Bearer ${current.token}`,
        'X-CSRF-Token': current.csrf,
      },
    }),
  );
};
