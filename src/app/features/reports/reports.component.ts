import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';

interface SegmentSummary {
  segment_label:          string;
  customer_count:         number;
  total_positive_balance: number;
  total_negative_balance: number;
  avg_balance:            number;
  critical_count:         number;
  high_count:             number;
  medium_count:           number;
  low_count:              number;
  priority:               number;
  action:                 string;
}

interface CustomerSegment {
  customer:       string;
  segment_label:  string;
  severity:       'critical' | 'high' | 'medium' | 'low';
  action:         string;
  balance:        number;
  total_orders:   number;
  total_payments: number;
  priority:       number;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CurrencyFormatPipe],
  template: `
    <div class="dash-header">
      <h1>Customer Reconciliation Dashboard</h1>
      <div class="dash-actions">
        <button class="btn-primary" (click)="runAnalysis()" [disabled]="running() || loading()">
          {{ running() ? 'Running…' : 'Run Analysis' }}
        </button>
        @if (lastRun()) {
          <span class="last-run">Last run: {{ lastRun() }}</span>
        }
      </div>
    </div>

    @if (loading()) {
      <p class="loading-msg">Loading analytics data…</p>
    } @else if (error()) {
      <p class="error-banner">{{ error() }}</p>
    } @else {

      <!-- KPI Cards -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Total Customers</div>
          <div class="kpi-value">{{ totalCustomers() }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Positive Exposure</div>
          <div class="kpi-value">{{ totalPositive() | currencyFormat }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Negative Exposure</div>
          <div class="kpi-value">{{ totalNegative() | currencyFormat }}</div>
        </div>
        <div class="kpi-card kpi-alert">
          <div class="kpi-label">Critical Customers</div>
          <div class="kpi-value">{{ criticalCount() }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Top Positive Segment</div>
          <div class="kpi-value kpi-label-value">{{ fmt(topPositiveSegment()) }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Top Negative Segment</div>
          <div class="kpi-value kpi-label-value">{{ fmt(topNegativeSegment()) }}</div>
        </div>
      </div>

      <!-- Segment Summary Table -->
      <h2 class="section-title">Segment Summary</h2>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Segment</th>
              <th class="num">Customers</th>
              <th class="num">Positive</th>
              <th class="num">Negative</th>
              <th class="num">Avg Balance</th>
              <th class="num">Critical</th>
              <th class="num">High</th>
              <th class="num">Priority</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            @for (seg of segments(); track seg.segment_label) {
              <tr>
                <td>{{ fmt(seg.segment_label) }}</td>
                <td class="num">{{ seg.customer_count }}</td>
                <td class="num">{{ seg.total_positive_balance | currencyFormat }}</td>
                <td class="num">{{ abs(seg.total_negative_balance) | currencyFormat }}</td>
                <td class="num">{{ seg.avg_balance | currencyFormat }}</td>
                <td class="num critical-cell">{{ seg.critical_count }}</td>
                <td class="num high-cell">{{ seg.high_count }}</td>
                <td class="num">{{ seg.priority }}</td>
                <td>{{ seg.action }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Charts -->
      <h2 class="section-title">Segment Charts</h2>
      <div class="charts-row">

        <div class="chart-box">
          <h3>Customers by Segment</h3>
          @for (seg of segments(); track seg.segment_label) {
            <div class="bar-row">
              <span class="bar-label">{{ fmt(seg.segment_label) }}</span>
              <div class="bar-track">
                <div class="bar-fill bar-blue"
                     [style.width.%]="seg.customer_count / maxCustomerCount() * 100"></div>
              </div>
              <span class="bar-val">{{ seg.customer_count }}</span>
            </div>
          }
        </div>

        <div class="chart-box">
          <h3>Exposure by Segment</h3>
          @for (seg of segments(); track seg.segment_label) {
            <div class="exposure-group">
              <div class="exposure-label">{{ fmt(seg.segment_label) }}</div>
              <div class="bar-row">
                <span class="bar-sub-lbl pos">+</span>
                <div class="bar-track">
                  <div class="bar-fill bar-green"
                       [style.width.%]="seg.total_positive_balance / maxExposure() * 100"></div>
                </div>
                <span class="bar-val">{{ seg.total_positive_balance | currencyFormat }}</span>
              </div>
              <div class="bar-row">
                <span class="bar-sub-lbl neg">−</span>
                <div class="bar-track">
                  <div class="bar-fill bar-red"
                       [style.width.%]="abs(seg.total_negative_balance) / maxExposure() * 100"></div>
                </div>
                <span class="bar-val">{{ abs(seg.total_negative_balance) | currencyFormat }}</span>
              </div>
            </div>
          }
        </div>

      </div>

      <!-- Customer Detail Table -->
      <h2 class="section-title">Customer Detail</h2>
      <div class="filter-row">
        <label>Segment:</label>
        <select (change)="onSegmentChange($event)">
          <option value="all">All Segments</option>
          @for (name of segmentNames(); track name) {
            <option [value]="name">{{ fmt(name) }}</option>
          }
        </select>
      </div>

      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Segment</th>
              <th>Severity</th>
              <th>Action</th>
              <th class="num">Balance</th>
              <th class="num">Orders</th>
              <th class="num">Payments</th>
            </tr>
          </thead>
          <tbody>
            @for (c of filteredCustomers(); track c.customer) {
              <tr>
                <td>{{ c.customer }}</td>
                <td>{{ fmt(c.segment_label) }}</td>
                <td [class]="'sev-' + c.severity">{{ c.severity }}</td>
                <td>{{ c.action }}</td>
                <td class="num">{{ c.balance | currencyFormat }}</td>
                <td class="num">{{ c.total_orders | currencyFormat }}</td>
                <td class="num">{{ c.total_payments | currencyFormat }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

    }
  `,
  styles: [`
    /* ── Layout ───────────────────────────────────────────────── */
    .dash-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    h1 { margin: 0; font-size: 1.4rem; }

    .dash-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .last-run { font-size: 0.8rem; color: #64748b; }

    .loading-msg { color: #64748b; }

    .section-title {
      font-size: 1.05rem;
      margin: 1.5rem 0 0.6rem;
      color: #334155;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 0.3rem;
    }

    /* ── KPI Cards ─────────────────────────────────────────────── */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
    }

    .kpi-card {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 0.8rem 1rem;
      background: #fff;
    }

    .kpi-alert { border-left: 4px solid #dc2626; }

    .kpi-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin-bottom: 0.25rem;
    }

    .kpi-value {
      font-size: 1.4rem;
      font-weight: 700;
      color: #1e293b;
    }

    .kpi-label-value {
      font-size: 0.95rem;
      text-transform: capitalize;
    }

    /* ── Tables ────────────────────────────────────────────────── */
    .table-wrap { overflow-x: auto; }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }

    .data-table th {
      text-align: left;
      padding: 0.4rem 0.7rem;
      background: #f1f5f9;
      border-bottom: 2px solid #e2e8f0;
      white-space: nowrap;
      color: #475569;
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .data-table td {
      padding: 0.4rem 0.7rem;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }

    .data-table tr:last-child td { border-bottom: none; }
    .data-table tr:hover td { background: #f8fafc; }

    th.num, td.num { text-align: right; }

    .critical-cell { color: #dc2626; font-weight: 600; }
    .high-cell     { color: #92400e; font-weight: 600; }

    /* Severity cells */
    .sev-critical { background: #f8d7da; color: #842029; font-weight: 600; padding: 0.2rem 0.5rem; border-radius: 4px; }
    .sev-high     { background: #fff3cd; color: #664d03; font-weight: 600; padding: 0.2rem 0.5rem; border-radius: 4px; }
    .sev-medium   { background: #cff4fc; color: #055160; padding: 0.2rem 0.5rem; border-radius: 4px; }
    .sev-low      { background: #e2e3e5; color: #41464b; padding: 0.2rem 0.5rem; border-radius: 4px; }

    /* ── Charts ────────────────────────────────────────────────── */
    .charts-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .chart-box {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 0.9rem 1rem;
      background: #fff;
    }

    .chart-box h3 {
      margin: 0 0 0.75rem;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
    }

    .bar-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.35rem;
    }

    .bar-label {
      width: 130px;
      flex-shrink: 0;
      font-size: 0.78rem;
      color: #475569;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-transform: capitalize;
    }

    .bar-track {
      flex: 1;
      height: 14px;
      background: #f1f5f9;
      border-radius: 3px;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.4s ease;
    }

    .bar-blue  { background: #3b82f6; }
    .bar-green { background: #22c55e; }
    .bar-red   { background: #ef4444; }

    .bar-val {
      width: 70px;
      flex-shrink: 0;
      font-size: 0.78rem;
      color: #334155;
      text-align: right;
    }

    /* Exposure chart extras */
    .exposure-group { margin-bottom: 0.5rem; }

    .exposure-label {
      font-size: 0.78rem;
      color: #475569;
      margin-bottom: 0.15rem;
      text-transform: capitalize;
    }

    .bar-row.sub { margin-bottom: 0.15rem; }

    .bar-sub-lbl {
      width: 14px;
      flex-shrink: 0;
      font-size: 0.75rem;
      font-weight: 700;
      text-align: center;
    }

    .bar-sub-lbl.pos { color: #16a34a; }
    .bar-sub-lbl.neg { color: #dc2626; }

    /* ── Customer filter ───────────────────────────────────────── */
    .filter-row {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin-bottom: 0.6rem;
      font-size: 0.85rem;
      color: #475569;
    }

    .filter-row select {
      padding: 0.3rem 0.6rem;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      font-size: 0.85rem;
    }
  `],
})
export class ReportsComponent implements OnInit {
  private http = inject(HttpClient);

  protected loading  = signal(true);
  protected running  = signal(false);
  protected error    = signal('');
  protected lastRun  = signal<string | null>(null);
  protected segments = signal<SegmentSummary[]>([]);
  protected customers = signal<CustomerSegment[]>([]);
  protected selectedSegment = signal('all');

  // KPI computeds
  protected totalCustomers    = computed(() => this.segments().reduce((s, seg) => s + seg.customer_count, 0));
  protected totalPositive     = computed(() => this.segments().reduce((s, seg) => s + seg.total_positive_balance, 0));
  protected totalNegative     = computed(() => this.segments().reduce((s, seg) => s + Math.abs(seg.total_negative_balance), 0));
  protected criticalCount     = computed(() => this.customers().filter(c => c.severity === 'critical').length);
  protected topPositiveSegment = computed(() =>
    [...this.segments()].sort((a, b) => b.total_positive_balance - a.total_positive_balance)[0]?.segment_label ?? '—');
  protected topNegativeSegment = computed(() =>
    [...this.segments()].sort((a, b) => Math.abs(b.total_negative_balance) - Math.abs(a.total_negative_balance))[0]?.segment_label ?? '—');

  // Chart scale
  protected maxCustomerCount = computed(() => Math.max(...this.segments().map(s => s.customer_count), 1));
  protected maxExposure      = computed(() =>
    Math.max(...this.segments().map(s => Math.max(s.total_positive_balance, Math.abs(s.total_negative_balance))), 1));

  // Filter options
  protected segmentNames = computed(() => this.segments().map(s => s.segment_label));

  // Sorted + filtered customers
  private readonly sevRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

  protected filteredCustomers = computed(() => {
    let list = this.customers();
    if (this.selectedSegment() !== 'all') {
      list = list.filter(c => c.segment_label === this.selectedSegment());
    }
    return [...list].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      const rd = (this.sevRank[b.severity] ?? 0) - (this.sevRank[a.severity] ?? 0);
      if (rd !== 0) return rd;
      return Math.abs(b.balance) - Math.abs(a.balance);
    });
  });

  ngOnInit(): void { this.loadData(); }

  private loadData(): void {
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      segs: this.http.get<{ segments: SegmentSummary[] }>('/api/analytics/segment-summary-db'),
      custs: this.http.get<{ customers: CustomerSegment[] }>('/api/analytics/customer-segments-db'),
    }).subscribe({
      next: ({ segs, custs }) => {
        this.segments.set(segs.segments);
        this.customers.set(custs.customers);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(
          err.error?.detail ?? err.error?.message ??
          'Could not reach the analytics service. Make sure the Python service is running on port 8000.'
        );
        this.loading.set(false);
      },
    });
  }

  runAnalysis(): void {
    this.running.set(true);
    this.http.post<{ run_id: number }>('/api/analytics/run-analysis-db', {}).subscribe({
      next: () => {
        this.running.set(false);
        this.lastRun.set(new Date().toLocaleTimeString());
        this.loadData();
      },
      error: err => {
        this.running.set(false);
        this.error.set(err.error?.detail ?? 'Failed to run analysis');
      },
    });
  }

  onSegmentChange(event: Event): void {
    this.selectedSegment.set((event.target as HTMLSelectElement).value);
  }

  fmt(label: string): string {
    return label === '—' ? label : label.replace(/_/g, ' ');
  }

  abs(n: number): number {
    return Math.abs(n);
  }
}
