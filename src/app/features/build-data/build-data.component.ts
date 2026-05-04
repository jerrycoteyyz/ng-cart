import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface ActionResult {
  label: string;
  detail: string;
}

@Component({
  selector: 'app-build-data',
  standalone: true,
  template: `
    <h1>Build More Data</h1>
    <p class="intro">
      Generate random customers, orders, and payments to populate the analytics report
      with meaningful segmentation data.
      <BR/><BR/>
      Click these buttons as often as you wish.  After adding orders and/or payments, the Reports link will show new results. 
    </p>

    <div class="action-grid">

      <div class="action-card">
        <h2>Add Customers</h2>
        <p>Adds 5 new generated customers (Customer_0001, Customer_0002 …) continuing
           from the last number already in the database. Password is <code>devpass123</code>.</p>
        <button class="btn-primary" (click)="run('add-customers')" [disabled]="busy()">
          {{ busy() === 'add-customers' ? 'Adding…' : 'Add 5 Customers' }}
        </button>
        @if (results()['add-customers']) {
          <div class="result" [class.error]="results()['add-customers']!.label === 'Error'">
            <strong>{{ results()['add-customers']!.label }}</strong>
            {{ results()['add-customers']!.detail }}
          </div>
        }
      </div>

      <div class="action-card">
        <h2>Add Orders</h2>
        <p>Selects a random 20% of all customers and creates one new order each,
           with 1–5 randomly chosen products at random quantities.</p>
        <button class="btn-primary" (click)="run('add-orders')" [disabled]="busy()">
          {{ busy() === 'add-orders' ? 'Adding…' : 'Add Orders' }}
        </button>
        @if (results()['add-orders']) {
          <div class="result" [class.error]="results()['add-orders']!.label === 'Error'">
            <strong>{{ results()['add-orders']!.label }}</strong>
            {{ results()['add-orders']!.detail }}
          </div>
        }
      </div>

      <div class="action-card">
        <h2>Add Payments</h2>
        <p>Selects a random 20% of all customers and records a payment of 30–200%
           of their current balance. Customers with no balance receive $200.</p>
        <button class="btn-primary" (click)="run('add-payments')" [disabled]="busy()">
          {{ busy() === 'add-payments' ? 'Adding…' : 'Add Payments' }}
        </button>
        @if (results()['add-payments']) {
          <div class="result" [class.error]="results()['add-payments']!.label === 'Error'">
            <strong>{{ results()['add-payments']!.label }}</strong>
            {{ results()['add-payments']!.detail }}
          </div>
        }
      </div>

    </div>
  `,
  styles: [`
    h1 { margin: 0 0 0.4rem; font-size: 1.4rem; }

    .intro {
      color: #64748b;
      font-size: 0.9rem;
      margin: 0 0 1.5rem;
    }

    .action-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.25rem;
    }

    .action-card {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 1.1rem;
      background: #fff;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    h2 {
      margin: 0;
      font-size: 1rem;
      color: #1e293b;
    }

    p {
      margin: 0;
      font-size: 0.85rem;
      color: #475569;
      flex: 1;
    }

    code {
      background: #f1f5f9;
      padding: 0.1rem 0.3rem;
      border-radius: 3px;
      font-size: 0.82rem;
    }

    .result {
      font-size: 0.82rem;
      padding: 0.5rem 0.75rem;
      border-radius: 4px;
      background: #dcfce7;
      color: #166534;
      border: 1px solid #86efac;
    }

    .result.error {
      background: #fee2e2;
      color: #991b1b;
      border-color: #fca5a5;
    }
  `],
})
export class BuildDataComponent {
  private http = inject(HttpClient);

  protected busy    = signal<string | false>(false);
  protected results = signal<Record<string, ActionResult>>({});

  run(action: 'add-customers' | 'add-orders' | 'add-payments'): void {
    this.busy.set(action);

    this.http.post<Record<string, unknown>>(`/api/dev/${action}`, {}).subscribe({
      next: (data) => {
        this.busy.set(false);
        const label  = this.successLabel(action, data);
        this.results.update(r => ({ ...r, [action]: { label: 'Done', detail: label } }));
      },
      error: (err) => {
        this.busy.set(false);
        this.results.update(r => ({
          ...r,
          [action]: { label: 'Error', detail: err.error?.message ?? 'Something went wrong' },
        }));
      },
    });
  }

  private successLabel(action: string, data: Record<string, unknown>): string {
    switch (action) {
      case 'add-customers': {
        const added = (data['added'] as unknown[])?.length ?? 0;
        return `${added} customers added.`;
      }
      case 'add-orders': {
        const count = data['ordersCreated'] as number ?? 0;
        return `${count} orders created.`;
      }
      case 'add-payments': {
        const count = data['paymentsCreated'] as number ?? 0;
        return `${count} payments recorded.`;
      }
      default: return 'Done.';
    }
  }
}
