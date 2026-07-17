import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Permission } from '../domain/auth.models';
import { AuthStore } from './auth.store';

export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  await auth.initialize();
  return auth.authenticated()
    ? true
    : router.createUrlTree(['/sign-in'], { queryParams: { redirect: state.url } });
};

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  await auth.initialize();
  return auth.authenticated() ? router.createUrlTree(['/dashboard']) : true;
};

export const requirePermission =
  (permission: Permission): CanActivateFn =>
  async () => {
    const auth = inject(AuthStore);
    const router = inject(Router);
    await auth.initialize();
    if (!auth.authenticated()) return router.createUrlTree(['/sign-in']);
    return auth.hasPermission(permission) ? true : router.createUrlTree(['/access-denied']);
  };
