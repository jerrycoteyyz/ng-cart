import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CartService } from '../../core/cart.service';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyFormatPipe],
  template: `
    <form [formGroup]="shippingForm" (ngSubmit)="proceed()">
      <h1>Checkout</h1>

      <section>
        <h2>Shipping Address</h2>

        <input formControlName="fullName" placeholder="Full name" />
        @if (shippingForm.get('fullName')?.invalid && shippingForm.get('fullName')?.touched) {
          <span class="error">Full name is required</span>
        }

        <input formControlName="street" placeholder="Street address" />
        @if (shippingForm.get('street')?.invalid && shippingForm.get('street')?.touched) {
          <span class="error">Street address is required</span>
        }

        <input formControlName="city" placeholder="City" />
        @if (shippingForm.get('city')?.invalid && shippingForm.get('city')?.touched) {
          <span class="error">City is required</span>
        }

        <div class="row">
          <div>
            <input formControlName="state" placeholder="State (2-letter)" />
            @if (shippingForm.get('state')?.invalid && shippingForm.get('state')?.touched) {
              <span class="error">2-letter state code required</span>
            }
          </div>
          <div>
            <input formControlName="zip" placeholder="ZIP" />
            @if (shippingForm.get('zip')?.invalid && shippingForm.get('zip')?.touched) {
              <span class="error">Valid ZIP required</span>
            }
          </div>
        </div>
      </section>

      <div class="order-total">
        Order total: <strong>{{ cart.summary().total | currencyFormat }}</strong>
      </div>

      <button type="submit" class="btn-primary">
        Proceed to Payment
      </button>
    </form>
  `,
  styles: [`
    form {
      max-width: 480px;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    h1 { margin: 0 0 0.5rem; font-size: 1.4rem; }
    h2 { margin: 0.5rem 0 0.25rem; font-size: 1rem; color: #475569; }

    input {
      width: 100%;
      padding: 0.45rem 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.95rem;
      box-sizing: border-box;
    }

    .row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }

    .order-total {
      margin-top: 0.5rem;
      font-size: 1rem;
      color: #475569;
    }

    .btn-primary { margin-top: 0.5rem; align-self: flex-start; }
  `],
})
export class CheckoutComponent {
  private fb     = inject(FormBuilder);
  private router = inject(Router);
  protected cart = inject(CartService);

  shippingForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    street:   ['', Validators.required],
    city:     ['', Validators.required],
    state:    ['', [Validators.required, Validators.minLength(2), Validators.maxLength(2)]],
    zip:      ['', [Validators.required, Validators.pattern(/^\d{5}(-\d{4})?$/)]],
  });

  proceed(): void {
    if (this.shippingForm.invalid) {
      this.shippingForm.markAllAsTouched();
      return;
    }
    this.router.navigate(['/payment'], {
      queryParams: { mode: 'checkout' },
      state:       { shipping: this.shippingForm.value },
    });
  }
}
