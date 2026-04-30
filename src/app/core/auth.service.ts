import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, map, tap, catchError, of } from 'rxjs';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  token: string;
}

interface LoginResponse {
  token: string;
  user: { id: string; email: string; name: string };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http   = inject(HttpClient);
  private router = inject(Router);

  private _user = signal<AuthUser | null>(this.loadFromStorage());

  readonly isLoggedIn  = computed(() => this._user() !== null);
  readonly currentUser = this._user.asReadonly();

  login(email: string, password: string): Observable<boolean> {
    return this.http.post<LoginResponse>('/api/auth/login', { email, password }).pipe(
      tap(({ token, user }) => {
        const authUser: AuthUser = { ...user, token };
        this._user.set(authUser);
        localStorage.setItem('auth_user', JSON.stringify(authUser));
      }),
      map(() => true),
      catchError(() => of(false)),
    );
  }

  logout(): void {
    this._user.set(null);
    localStorage.removeItem('auth_user');
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this._user()?.token ?? null;
  }

  private loadFromStorage(): AuthUser | null {
    try {
      const raw = localStorage.getItem('auth_user');
      if (!raw) return null;
      const user = JSON.parse(raw) as AuthUser;
      if (this.isTokenExpired(user.token)) {
        localStorage.removeItem('auth_user');
        return null;
      }
      return user;
    } catch {
      return null;
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload['exp'] * 1000 < Date.now();
    } catch {
      return true;
    }
  }
}
