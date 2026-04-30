import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

// Every outbound HTTP request passes through here.
// The interceptor receives the request, can modify it, then calls next() to continue.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();

  // HTTP requests are immutable — you must clone to modify
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Token expired — log out and redirect without the component knowing
        auth.logout();
      }
      if (error.status === 0) {
        console.error('Network error — is the server running?');
      }
      return throwError(() => error);
    })
  );
};