import { Component, Input, Output, EventEmitter, input, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';
import { CartService } from '../../../core/cart.service';
import { inject } from '@angular/core';
import { Product } from '../../../models/product.model';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CurrencyFormatPipe],
  // OnPush: Angular only re-renders this component when:
  //   1. An @Input reference changes
  //   2. An event originates from this component
  //   3. An Observable/Signal it uses emits
  // Opt in once your app is stable — big performance gain for list items.
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <img [src]="product.imageUrl" [alt]="product.name" loading="lazy" />
      <div class="card-body">
        <h3>{{ product.name }}</h3>
        <p class="price">{{ product.price | currencyFormat }}</p>
        <p class="stock">
          @if (product.stock > 0) {
            {{ product.stock }} in stock
          } @else {
            <span class="out-of-stock">Out of stock</span>
          }
        </p>
        <button
          (click)="addToCart()"
          [disabled]="product.stock === 0"
          class="btn-primary"
        >
          Add to Cart
        </button>
      </div>
    </div>
  `,
})
export class ProductCardComponent {
  private cartSvc = inject(CartService);

  // Classic decorator-based Input — still the most common in real codebases
  @Input({ required: true }) product!: Product;

  // Signal input (Angular 17.1+) — alternative modern syntax.
  // Reads as: this.quantity() instead of this.quantity
  // quantity = input<number>(1); // optional with default
  // quantity = input.required<number>(); // required

  // @Output is always an EventEmitter. The parent binds with (addedToCart)="handler($event)"
  @Output() addedToCart = new EventEmitter<Product>();

  addToCart() {
    this.cartSvc.addToCart(this.product);
    this.addedToCart.emit(this.product); // notify parent
  }
}