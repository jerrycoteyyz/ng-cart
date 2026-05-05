import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="page">

      <!-- ── Portfolio guide ─────────────────────────────────────────── -->
      <div class="guide">
        <div class="guide-header">
          <div class="badge">Portfolio Project</div>
          <h1>NgCart</h1>
          <p class="tagline">A full-stack cloud application built in 72 hours using AI-augmented development</p>
        </div>

        <div class="guide-body">
          <p class="intro">
            This is my first AI-augmented cloud application — built entirely from scratch
            using Claude and VS Code through iterative prompting, without writing a single
            line of code by hand.
          </p>

          <div class="features">
            <div class="feature">
              <div class="feature-title">Orders &amp; Payments</div>
              <div class="feature-desc">
                Orders and payments are deliberately separated. Customers can order on credit
                and pay independently — intentionally creating underpaid and overpaid
                customers for analysis.
              </div>
            </div>

            <div class="feature">
              <div class="feature-title">KMeans Customer Segmentation</div>
              <div class="feature-desc">
                A Python FastAPI service runs scikit-learn KMeans clustering to segment
                customers by payment behaviour — identifying who to collect from, who to
                audit, and who to retain.
              </div>
            </div>

            <div class="feature">
              <div class="feature-title">Live Data Generation</div>
              <div class="feature-desc">
                The Build More Data page randomly generates customers, orders, and payments.
                Re-run the analysis after each generation to see the segments shift.
              </div>
            </div>

            <div class="feature">
              <div class="feature-title">Stack</div>
              <div class="feature-desc">
                Angular 21 · Node.js / Express · Python / FastAPI · PostgreSQL · Docker ·
                AWS EC2, RDS &amp; CloudFront
              </div>
            </div>
          </div>

          <div class="credentials">
            <div class="cred-title">Log in with any of these accounts</div>
            <div class="cred-row">
              <span class="cred-label">Email</span>
              <code>customer_0001@ngcart.dev</code> through <code>customer_0045@ngcart.dev</code>
            </div>
            <div class="cred-row">
              <span class="cred-label">Password</span>
              <code>devpass123</code>
            </div>
            <div class="cred-note">alice@example.com and bob@example.com also work with the same password.</div>
          </div>
        </div>
      </div>

      <!-- ── Login form ───────────────────────────────────────────────── -->
      <div class="login-panel">
        <h2>Sign In</h2>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="field">
            <label for="email">Email</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              autocomplete="email"
              placeholder="customer_0001@ngcart.dev"
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
              placeholder="devpass123"
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

        <div class="github-link">
          <a href="https://github.com/jerrycoteyyz/ng-cart" target="_blank" rel="noopener">
            View source on GitHub
          </a>
        </div>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }

    .page {
      display: grid;
      grid-template-columns: 1fr 380px;
      gap: 0;
      min-height: 100%;
    }

    /* ── Guide panel ──────────────────────────────────────────────────── */
    .guide {
      background: #0f172a;
      color: #e2e8f0;
      padding: 3rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
      font-family: 'Segoe UI', system-ui, sans-serif;
    }

    .guide-header { display: flex; flex-direction: column; gap: 0.6rem; }

    .badge {
      display: inline-block;
      background: #2563eb;
      color: #fff;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      padding: 0.25rem 0.65rem;
      border-radius: 999px;
      width: fit-content;
    }

    .guide h1 {
      font-size: 2.5rem;
      font-weight: 800;
      color: #f8fafc;
      margin: 0;
      letter-spacing: -0.02em;
    }

    .tagline {
      font-size: 1rem;
      color: #94a3b8;
      margin: 0;
      line-height: 1.5;
    }

    .guide-body { display: flex; flex-direction: column; gap: 1.75rem; }

    .intro {
      font-size: 0.95rem;
      color: #cbd5e1;
      line-height: 1.7;
      margin: 0;
      border-left: 3px solid #2563eb;
      padding-left: 1rem;
    }

    .features {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
    }

    .feature {
      background: #1e293b;
      border-radius: 8px;
      padding: 1rem 1.1rem;
      border: 1px solid #334155;
    }

    .feature-title {
      font-size: 0.82rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #60a5fa;
      margin-bottom: 0.4rem;
    }

    .feature-desc {
      font-size: 0.85rem;
      color: #94a3b8;
      line-height: 1.6;
    }

    .credentials {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 1rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .cred-title {
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #60a5fa;
      margin-bottom: 0.25rem;
    }

    .cred-row {
      display: flex;
      align-items: baseline;
      gap: 0.6rem;
      font-size: 0.875rem;
      flex-wrap: wrap;
    }

    .cred-label {
      color: #64748b;
      min-width: 60px;
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    code {
      background: #0f172a;
      border: 1px solid #334155;
      color: #7dd3fc;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      font-size: 0.82rem;
      font-family: 'Cascadia Code', 'Consolas', monospace;
    }

    .cred-note {
      font-size: 0.78rem;
      color: #475569;
      margin-top: 0.25rem;
    }

    /* ── Login panel ──────────────────────────────────────────────────── */
    .login-panel {
      background: #fff;
      padding: 3rem 2.5rem;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 1.5rem;
      border-left: 1px solid #e2e8f0;
    }

    h2 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    label {
      font-size: 0.82rem;
      font-weight: 600;
      color: #475569;
      letter-spacing: 0.02em;
    }

    input {
      padding: 0.55rem 0.85rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.95rem;
      color: #1e293b;
      transition: border-color 0.15s;
    }

    input:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
    }

    .btn-primary { margin-top: 0.5rem; width: 100%; justify-content: center; }

    .github-link {
      text-align: center;
      font-size: 0.82rem;
    }

    .github-link a {
      color: #64748b;
      text-decoration: none;
    }

    .github-link a:hover { color: #2563eb; text-decoration: underline; }
  `],
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
