import { Injectable, signal, computed, effect } from '@angular/core';
import { Product } from '../models/product.model';
import { CartItem, CartSummary } from '../models/cart.model';

const TAX_RATE = 0.08;

@Injectable({ providedIn: 'root' })
export class CartService {
  // The single source of truth — a signal holding the array of cart items.
  // Private so only this service mutates it.
  private _items = signal<CartItem[]>([]);

  // computed() = derived state. Angular tracks which signals are read inside
  // and re-runs this function only when those signals change. Like a spreadsheet cell.
  readonly summary = computed<CartSummary>(() => {
    const items = this._items();
    const subtotal = items.reduce(
      (sum, i) => sum + i.product.price * i.quantity, 0
    );
    const tax = subtotal * TAX_RATE;
    return {
      items,
      totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal,
      tax,
      total: subtotal + tax,
    };
  });

  // Convenience computed values for the header badge, etc.
  readonly itemCount = computed(() => this.summary().totalItems);
  readonly isEmpty = computed(() => this._items().length === 0);

  // effect() runs whenever its signal dependencies change — like useEffect with
  // automatic dependency tracking. Use sparingly; prefer computed() for derived state.
  constructor() {
    effect(() => {
      // Persist cart to localStorage whenever it changes
      localStorage.setItem('cart', JSON.stringify(this._items()));
    });

    // Restore persisted cart on startup
    const saved = localStorage.getItem('cart');
    if (saved) {
      this._items.set(JSON.parse(saved));
    }
  }

  addToCart(product: Product, quantity = 1): void {
    // signal.update() takes a pure function — previous state in, new state out.
    // Never mutate the array directly; always return a new one (signals track by reference).
    this._items.update(items => {
      const existing = items.find(i => i.product.id === product.id);
      if (existing) {
        return items.map(i =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...items, { product, quantity }];
    });
  }

  updateQuantity(productId: number, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(productId);
      return;
    }
    this._items.update(items =>
      items.map(i =>
        i.product.id === productId ? { ...i, quantity } : i
      )
    );
  }

  removeItem(productId: number): void {
    this._items.update(items =>
      items.filter(i => i.product.id !== productId)
    );
  }

  clearCart(): void {
    this._items.set([]);
  }
}