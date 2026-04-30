import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

// Functional guard — a plain function, no class needed (Angular 14.2+).
// inject() works here because Angular calls this function within an injection context.
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return true; // allow navigation
  }

  // UrlTree redirect: cancels current nav, starts new one to /login.
  // Cleaner than router.navigate() because the router handles it atomically.
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url }, // preserve intended destination
  });
};

// A guard that prevents logged-in users from hitting /login again
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() ? router.createUrlTree(['/products']) : true;
};