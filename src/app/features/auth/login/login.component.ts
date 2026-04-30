import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="login-container">
      <h1>Sign In</h1>

      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="field">
          <label for="email">Email</label>
          <input
            id="email"
            type="email"
            formControlName="email"
            autocomplete="email"
            placeholder="you@example.com"
          />
          @if (form.get('email')?.invalid && form.get('email')?.touched) {
            <span class="error">A valid email is required</span>
          }
        </div>

        <div class="field">
          <label for="password">Password</label>
          <input
            id="password"
            type="password"
            formControlName="password"
            autocomplete="current-password"
          />
          @if (form.get('password')?.invalid && form.get('password')?.touched) {
            <span class="error">Password is required</span>
          }
        </div>

        @if (errorMessage()) {
          <p class="error-banner">{{ errorMessage() }}</p>
        }

        <button type="submit" [disabled]="submitting()" class="btn-primary">
          {{ submitting() ? 'Signing in…' : 'Sign In' }}
        </button>
      </form>
    </div>
  `,
})
export class LoginComponent {
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);

  protected submitting   = signal(false);
  protected errorMessage = signal('');

  form = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    const { email, password } = this.form.value;

    this.auth.login(email!, password!).subscribe(success => {
      this.submitting.set(false);
      if (success) {
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] ?? '/products';
        this.router.navigateByUrl(returnUrl);
      } else {
        this.errorMessage.set('Invalid email or password');
      }
    });
  }
}
