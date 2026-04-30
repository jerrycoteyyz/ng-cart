import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { Subject, combineLatest, startWith } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { ProductService } from '../../../core/product.service';
import { Product, ProductCategory } from '../../../models/product.model';
import { ProductCardComponent } from '../product-card/product-card.component';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [FormsModule, AsyncPipe, ProductCardComponent],
  template: `
    <div class="filters">
      <!-- Template-driven form element: [(ngModel)] is two-way binding.
           The "banana in a box" syntax: [ngModel]="x" + (ngModelChange)="x=$event" -->
      <input
        [(ngModel)]="searchQuery"
        (ngModelChange)="search$.next($event)"
        placeholder="Search products..."
        class="search-input"
      />

      <select [(ngModel)]="selectedCategory" (ngModelChange)="category$.next($event)">
        <option value="all">All Categories</option>
        <option value="electronics">Electronics</option>
        <option value="clothing">Clothing</option>
        <option value="books">Books</option>
      </select>
    </div>

    <!-- async pipe subscribes to the Observable, unwraps the value, and
         automatically unsubscribes when the component destroys. Use this
         instead of subscribing in ngOnInit wherever possible. -->
    @if (products$ | async; as state) {
      @if (state.loading) {
        <div class="loading">Loading...</div>
      } @else if (state.error) {
        <div class="error">{{ state.error }}</div>
      } @else {
        <!-- @for requires a track expression (replaces trackBy from *ngFor).
             Angular uses it to identify items for efficient DOM reuse. -->
        <div class="product-grid">
          @for (product of state.products; track product.id) {
            <app-product-card
              [product]="product"
              (addedToCart)="onAddedToCart($event)"
            />
          } @empty {
            <p>No products found.</p>
          }
        </div>
      }
    }
  `,
  styles: [`
    .filters {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .search-input {
      flex: 1;
      padding: 0.4rem 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.95rem;
    }

    select {
      padding: 0.4rem 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.95rem;
    }

    .product-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
    }
  `],
})
export class ProductListComponent {
  private productSvc = inject(ProductService);

  searchQuery = '';
  selectedCategory: ProductCategory = 'all';

  // Subjects are the "input" end of an Observable stream — you push values in,
  // subscribers see them come out. Using Subject instead of ngModel directly
  // lets us pipe through RxJS operators before triggering the HTTP call.
  search$ = new Subject<string>();
  category$ = new Subject<ProductCategory>();

  products$ = combineLatest([
    // startWith emits an initial value so combineLatest fires immediately
    // (combineLatest waits for ALL sources to emit at least once)
    this.search$.pipe(startWith(''), debounceTime(300), distinctUntilChanged()),
    this.category$.pipe(startWith('all' as ProductCategory)),
  ]).pipe(
    // switchMap: when a new value arrives, CANCEL the previous inner Observable
    // and start a new one. Perfect for search — prevents stale results.
    // (mergeMap would keep all in-flight requests; concatMap would queue them)
    switchMap(([query, category]) =>
      this.productSvc.getProducts(category, query).pipe(
        map(res => ({ loading: false, products: res.data, error: null })),
        startWith({ loading: true, products: [], error: null }),
        catchError(err => of({ loading: false, products: [], error: err.message }))
      )
    )
  );

  onAddedToCart(product: Product) {
    // CartService is a singleton — inject it anywhere and it's the same instance
    // (In a larger app, you might inject CartService directly in this component)
    console.log('Added to cart:', product.name);
  }
}