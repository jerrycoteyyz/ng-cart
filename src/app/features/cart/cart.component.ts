import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { CartService } from '../../core/cart.service';
import { CartItem } from '../../models/cart.model';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [RouterLink, CurrencyFormatPipe],
  template: `
    <h1>Your Cart</h1>

    @if (cart.isEmpty()) {
      <div class="empty-cart">
        <p>Your cart is empty.</p>
        <a routerLink="/products">Continue Shopping</a>
      </div>
    } @else {
      <div class="cart-layout">

        <div class="items-scroll">
          <div class="cart-grid">
            @for (item of cart.summary().items; track item.product.id) {
              <div class="cart-card">
                <div class="card-name">{{ item.product.name }}</div>
                <div class="card-unit">{{ item.product.price | currencyFormat }} each</div>

                <div class="quantity-control">
                  <button (click)="decrement(item)">−</button>
                  <span>{{ item.quantity }}</span>
                  <button (click)="increment(item)">+</button>
                </div>

                <div class="card-line-total">{{ item.product.price * item.quantity | currencyFormat }}</div>

                <button (click)="remove(item)" class="remove-btn">Remove</button>
              </div>
            }
          </div>
        </div>

        <div class="checkout-bar">
          <div class="summary-lines">
            <div class="summary-row">
              <span>Subtotal</span>
              <span>{{ cart.summary().subtotal | currencyFormat }}</span>
            </div>
            <div class="summary-row">
              <span>Tax (8%)</span>
              <span>{{ cart.summary().tax | currencyFormat }}</span>
            </div>
            <div class="summary-row total-row">
              <span>Total</span>
              <span>{{ cart.summary().total | currencyFormat }}</span>
            </div>
          </div>

          <div class="checkout-actions">
            <a routerLink="/products" class="btn-ghost">Continue Shopping</a>
            <a routerLink="/checkout" class="btn-primary">Proceed to Checkout</a>
            <button (click)="cart.clearCart()" class="btn-ghost">Clear Cart</button>
          </div>
        </div>

      </div>
    }
  `,
  styles: [`
    h1 { margin: 0 0 1rem; font-size: 1.4rem; }

    .empty-cart {
      color: #64748b;
    }
    .empty-cart a { color: #2563eb; }

    .cart-layout {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .items-scroll {
      max-height: calc(100vh - 290px);
      overflow-y: auto;
      padding-right: 0.25rem;
    }

    .cart-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }

    .cart-card {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 0.85rem;
      background: #fff;
      font-size: 0.9rem;
    }

    .card-name {
      font-weight: 600;
      color: #1e293b;
    }

    .card-unit {
      color: #64748b;
      font-size: 0.82rem;
    }

    .quantity-control {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.25rem;
    }

    .quantity-control button {
      width: 1.75rem;
      height: 1.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      background: #f8fafc;
      cursor: pointer;
      font-size: 1rem;
      line-height: 1;
      &:hover { background: #e2e8f0; }
    }

    .quantity-control span {
      min-width: 1.5rem;
      text-align: center;
      font-weight: 600;
    }

    .card-line-total {
      font-weight: 700;
      color: #1e293b;
    }

    .remove-btn {
      margin-top: auto;
      background: none;
      border: none;
      color: #ef4444;
      font-size: 0.8rem;
      cursor: pointer;
      text-align: left;
      padding: 0;
      &:hover { text-decoration: underline; }
    }

    .checkout-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 2rem;
      border-top: 1px solid #e2e8f0;
      padding: 0.85rem 0 0;
      margin-top: 1rem;
      background: #f8fafc;
    }

    .summary-lines {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.9rem;
    }

    .summary-row {
      display: flex;
      gap: 1.5rem;
      justify-content: space-between;
      color: #475569;
    }

    .total-row {
      font-weight: 700;
      color: #1e293b;
      font-size: 1rem;
    }

    .checkout-actions {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      align-items: stretch;
      min-width: 180px;
    }

    .btn-primary, .btn-ghost {
      text-align: center;
      text-decoration: none;
    }
  `],
})
export class CartComponent {
  protected cart = inject(CartService);

  increment(item: CartItem) {
    this.cart.updateQuantity(item.product.id, item.quantity + 1);
  }

  decrement(item: CartItem) {
    this.cart.updateQuantity(item.product.id, item.quantity - 1);
  }

  remove(item: CartItem) {
    this.cart.removeItem(item.product.id);
  }
}
