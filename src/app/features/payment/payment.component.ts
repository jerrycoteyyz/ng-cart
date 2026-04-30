import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CartService } from '../../core/cart.service';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';

interface Balance {
  balance:       number;
  totalOrders:   number;
  totalPayments: number;
}

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyFormatPipe],
  template: `
    @if (isCheckout()) {

      <!-- ── Checkout payment decision ─────────────────────────────── -->
      <h1>Complete Your Order</h1>

      <div class="order-summary-card">
        <div class="summary-row">
          <span>Order Total</span>
          <strong>{{ cart.summary().total | currencyFormat }}</strong>
        </div>
        <div class="summary-note">Card on file will be charged for "Pay now".</div>
      </div>

      @if (submitError()) {
        <p class="error-banner">{{ submitError() }}</p>
      }

      <div class="checkout-actions">
        <button (click)="payNow()" [disabled]="submitting()" class="btn-primary">
          {{ submitting() ? 'Processing…' : 'Pay now from card on file' }}
        </button>
        <button (click)="putOnTab()" [disabled]="submitting()" class="btn-ghost">
          Put it on my tab
        </button>
      </div>

    } @else {

      <!-- ── Standalone make-payment ───────────────────────────────── -->
      <h1>Make a Payment</h1>

      @if (loading()) {
        <p>Loading balance…</p>
      } @else if (loadError()) {
        <p class="error-banner">{{ loadError() }}</p>
      } @else {
        <div class="balance-card">
          <div class="balance-row">
            <span>Total Orders</span>
            <span>{{ balance()!.totalOrders | currencyFormat }}</span>
          </div>
          <div class="balance-row">
            <span>Total Payments</span>
            <span>{{ balance()!.totalPayments | currencyFormat }}</span>
          </div>
          <div class="balance-row balance-due" [class.credit]="balance()!.balance <= 0">
            <span>{{ balance()!.balance > 0 ? 'Balance Due' : 'Credit on Account' }}</span>
            <span>{{ (balance()!.balance < 0 ? -balance()!.balance : balance()!.balance) | currencyFormat }}</span>
          </div>
        </div>

        @if (success()) {
          <p class="success-banner">Payment recorded — thank you!</p>
        }

        <form [formGroup]="amountForm" (ngSubmit)="makePayment()">
          <div class="field">
            <label>Amount</label>
            <input type="number" formControlName="amount" placeholder="0.00" min="0.01" step="0.01" />
            @if (amountForm.get('amount')?.invalid && amountForm.get('amount')?.touched) {
              <span class="error">Enter an amount greater than zero</span>
            }
          </div>

          <div class="field">
            <label>Note <span class="optional">(optional)</span></label>
            <input formControlName="note" placeholder="e.g. Payment for November orders" />
          </div>

          @if (submitError()) {
            <p class="error-banner">{{ submitError() }}</p>
          }

          <button type="submit" class="btn-primary" [disabled]="amountForm.invalid || submitting()">
            {{ submitting() ? 'Recording…' : 'Pay now from card on file' }}
          </button>
        </form>
      }

    }
  `,
  styles: [`
    h1 { margin: 0 0 1.25rem; font-size: 1.4rem; }

    /* ── Checkout mode ─────────────────────────────────────────────── */
    .order-summary-card {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 0.9rem 1.1rem;
      max-width: 360px;
      margin-bottom: 1.25rem;
      background: #fff;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      font-size: 1rem;
      margin-bottom: 0.4rem;
    }

    .summary-note {
      font-size: 0.8rem;
      color: #94a3b8;
      margin-top: 0.25rem;
    }

    .checkout-actions {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      max-width: 360px;
    }

    .checkout-actions button { width: 100%; }

    /* ── Standalone mode ───────────────────────────────────────────── */
    .balance-card {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      overflow: hidden;
      max-width: 360px;
      margin-bottom: 1.5rem;
      font-size: 0.9rem;
    }

    .balance-row {
      display: flex;
      justify-content: space-between;
      padding: 0.45rem 0.9rem;
      border-bottom: 1px solid #f1f5f9;
      color: #475569;
    }

    .balance-due {
      font-weight: 700;
      font-size: 0.95rem;
      color: #dc2626;
      background: #fef2f2;
      border-bottom: none;
    }

    .balance-due.credit { color: #16a34a; background: #f0fdf4; }

    .success-banner {
      background: #dcfce7;
      border: 1px solid #86efac;
      border-radius: 6px;
      padding: 0.6rem 1rem;
      color: #166534;
      margin-bottom: 1rem;
      max-width: 360px;
    }

    form {
      max-width: 360px;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .field { display: flex; flex-direction: column; gap: 0.25rem; }

    label { font-size: 0.85rem; font-weight: 500; color: #475569; }

    .optional { font-weight: 400; color: #94a3b8; }

    input {
      padding: 0.45rem 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.95rem;
    }
  `],
})
export class PaymentComponent implements OnInit {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private http   = inject(HttpClient);
  private fb     = inject(FormBuilder);
  protected cart = inject(CartService);

  protected isCheckout  = signal(false);
  protected loading     = signal(false);
  protected loadError   = signal('');
  protected balance     = signal<Balance | null>(null);
  protected submitting  = signal(false);
  protected submitError = signal('');
  protected success     = signal(false);

  private shipping: unknown = null;

  amountForm = this.fb.group({
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    note:   [''],
  });

  ngOnInit(): void {
    const mode = this.route.snapshot.queryParamMap.get('mode');

    if (mode === 'checkout') {
      this.isCheckout.set(true);
      const state = window.history.state as { shipping?: unknown };
      if (!state?.shipping) {
        this.router.navigate(['/checkout']);
        return;
      }
      this.shipping = state.shipping;
    } else {
      this.loadBalance();
    }
  }

  private loadBalance(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.http.get<Balance>('/api/balance').subscribe({
      next:  b   => { this.balance.set(b); this.loading.set(false); },
      error: err => { this.loadError.set(err.error?.message ?? 'Could not load balance'); this.loading.set(false); },
    });
  }

  payNow(): void { this.placeOrder(false); }
  putOnTab(): void { this.placeOrder(true); }

  private placeOrder(deferred: boolean): void {
    this.submitting.set(true);
    this.submitError.set('');

    this.http.post<{ orderId: number }>('/api/orders', {
      shipping: this.shipping,
      items:    this.cart.summary().items,
      deferred,
    }).subscribe({
      next: ({ orderId }) => {
        this.cart.clearCart();
        this.router.navigate(['/orders/confirmation'], { queryParams: { id: orderId } });
      },
      error: err => {
        this.submitting.set(false);
        this.submitError.set(err.error?.message ?? 'Failed to place order. Please try again.');
      },
    });
  }

  makePayment(): void {
    if (this.amountForm.invalid) { this.amountForm.markAllAsTouched(); return; }

    this.submitting.set(true);
    this.submitError.set('');
    this.success.set(false);

    const { amount, note } = this.amountForm.value;
    this.http.post('/api/payments', { amount, note }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.success.set(true);
        this.amountForm.reset();
        this.loadBalance();
      },
      error: err => {
        this.submitting.set(false);
        this.submitError.set(err.error?.message ?? 'Failed to record payment');
      },
    });
  }
}
