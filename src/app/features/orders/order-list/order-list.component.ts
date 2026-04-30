import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';

interface OrderItem {
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

interface Order {
  id: number;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  placedAt: string;
  items: OrderItem[];
}

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [RouterLink, DatePipe, CurrencyFormatPipe],
  template: `
    <h1>Your Orders</h1>

    @if (loading()) {
      <p>Loading orders…</p>
    } @else if (error()) {
      <p class="error-banner">{{ error() }}</p>
    } @else if (orders().length === 0) {
      <div class="empty-state">
        <p>No orders yet.</p>
        <a routerLink="/products">Start shopping</a>
      </div>
    } @else {
      <div class="order-list">
        @for (order of orders(); track order.id) {
          <div class="order-block">

            <div class="order-header-row">
              <span class="order-id">Order #{{ order.id }}</span>
              <span class="order-date">{{ order.placedAt | date:'mediumDate' }}</span>
              <span class="order-status status-{{ order.status }}">{{ order.status }}</span>
              <span class="order-total">{{ order.total | currencyFormat }}</span>
            </div>

            @for (item of order.items; track item.productName) {
              <div class="item-row">
                <span class="item-name">{{ item.productName }}</span>
                <span class="item-unit">{{ item.unitPrice | currencyFormat }}</span>
                <span class="item-qty">× {{ item.quantity }}</span>
                <span class="item-line">{{ item.lineTotal | currencyFormat }}</span>
              </div>
            }

            <div class="order-summary-row">
              <span>Subtotal</span><span>{{ order.subtotal | currencyFormat }}</span>
              <span>Tax</span><span>{{ order.tax | currencyFormat }}</span>
              <span class="summary-total-label">Total</span><span class="summary-total">{{ order.total | currencyFormat }}</span>
            </div>

          </div>
        }
      </div>
    }
  `,
  styles: [`
    h1 { margin: 0 0 1.25rem; font-size: 1.4rem; }

    .order-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .order-block {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      overflow: hidden;
      font-size: 0.9rem;
    }

    .order-header-row {
      display: grid;
      grid-template-columns: auto 1fr auto auto;
      gap: 1.5rem;
      align-items: center;
      padding: 0.55rem 0.9rem;
      background: #f1f5f9;
      font-weight: 600;
    }

    .order-id   { color: #1e293b; }
    .order-date { color: #64748b; font-weight: 400; }
    .order-total { text-align: right; }

    .order-status {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
    }
    .status-confirmed { background: #dcfce7; color: #166534; }
    .status-pending   { background: #fef9c3; color: #854d0e; }
    .status-cancelled { background: #fee2e2; color: #991b1b; }

    .item-row {
      display: grid;
      grid-template-columns: 1fr auto auto auto;
      gap: 1.5rem;
      align-items: center;
      padding: 0.35rem 0.9rem 0.35rem 1.75rem;
      border-top: 1px solid #f1f5f9;
      color: #334155;
    }

    .item-unit, .item-qty { color: #64748b; }
    .item-line  { text-align: right; }

    .order-summary-row {
      display: grid;
      grid-template-columns: auto auto auto auto auto auto;
      gap: 0.5rem 1rem;
      align-items: center;
      justify-content: end;
      padding: 0.45rem 0.9rem;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
      color: #475569;
      font-size: 0.85rem;
    }

    .summary-total-label,
    .summary-total { font-weight: 700; color: #1e293b; }

    .empty-state {
      color: #64748b;
    }

    .empty-state a {
      color: #2563eb;
    }
  `],
})
export class OrderListComponent implements OnInit {
  private http = inject(HttpClient);

  protected loading = signal(true);
  protected error   = signal('');
  protected orders  = signal<Order[]>([]);

  ngOnInit(): void {
    this.http.get<{ orders: Order[] }>('/api/orders').subscribe({
      next: ({ orders }) => {
        this.orders.set(orders);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? 'Could not load orders');
        this.loading.set(false);
      },
    });
  }
}
