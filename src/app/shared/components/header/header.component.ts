import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';
import { AuthService } from '../../../core/auth.service';
import { CartService } from '../../../core/cart.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    @if (auth.isLoggedIn()) {
      <header class="header">
        <nav>
          <a routerLink="/products" routerLinkActive="active">Shop</a>
          <a routerLink="/orders"   routerLinkActive="active">Existing Orders</a>
          <a routerLink="/payment"  routerLinkActive="active">Make Payment</a>
          <a routerLink="/reports"  routerLinkActive="active">Reports</a>
        </nav>

        <div class="header-right">
          @if (!onCartPage()) {
            <a routerLink="/cart" class="cart-link">
              Cart
              @if (cart.itemCount() > 0) {
                <span class="badge">{{ cart.itemCount() }}</span>
              }
            </a>
          }
          <button (click)="requestLogout()" class="btn-ghost logout-btn">Logout</button>
        </div>
      </header>

      @if (confirming()) {
        <div class="logout-confirm-banner">
          <span>
            You have {{ cart.itemCount() }} item{{ cart.itemCount() === 1 ? '' : 's' }} in your cart.
            The cart will be cleared — log out anyway?
          </span>
          <div class="logout-confirm-actions">
            <button (click)="confirmLogout()" class="btn-danger">Yes, log out</button>
            <button (click)="confirming.set(false)" class="btn-ghost">No, stay</button>
          </div>
        </div>
      }
    }
  `,
  styles: [`
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1.5rem;
      background: #fff;
      border-bottom: 1px solid #e2e8f0;
    }

    nav {
      display: flex;
      flex-direction: row;
      gap: 1.5rem;
      align-items: center;
    }

    nav a {
      text-decoration: none;
      color: #475569;
      font-size: 0.95rem;
    }

    nav a.active {
      color: #2563eb;
      font-weight: 600;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .cart-link {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      text-decoration: none;
      color: #2563eb;
      font-weight: 500;
      font-size: 0.95rem;
    }

    .badge {
      background: #2563eb;
      color: #fff;
      border-radius: 999px;
      padding: 0 0.45rem;
      font-size: 0.75rem;
      line-height: 1.4;
    }

    .logout-btn {
      font-size: 0.9rem;
      padding: 0.35rem 1rem;
    }

    .logout-confirm-banner {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.75rem 1.5rem;
      background: #fef9c3;
      border-bottom: 1px solid #fde68a;
    }

    .logout-confirm-actions {
      display: flex;
      gap: 0.5rem;
    }
  `],
})
export class HeaderComponent {
  private  router = inject(Router);
  protected auth  = inject(AuthService);
  protected cart  = inject(CartService);
  protected confirming = signal(false);

  protected onCartPage = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => this.router.url === '/cart'),
      startWith(this.router.url === '/cart'),
    ),
    { initialValue: false },
  );

  requestLogout(): void {
    if (this.cart.isEmpty()) {
      this.auth.logout();
    } else {
      this.confirming.set(true);
    }
  }

  confirmLogout(): void {
    this.cart.clearCart();
    this.confirming.set(false);
    this.auth.logout();
  }
}
