import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { switchMap } from 'rxjs/operators';
import { ProductService } from '../../../core/product.service';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';
import { CartService } from '../../../core/cart.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [AsyncPipe, RouterLink, CurrencyFormatPipe],
  template: `
    @if (product$ | async; as product) {
      <div class="product-detail">
        <a routerLink="/products">← Back to shop</a>
        <img [src]="product.imageUrl" [alt]="product.name" />
        <h1>{{ product.name }}</h1>
        <p class="price">{{ product.price | currencyFormat }}</p>
        <p class="description">{{ product.description }}</p>
        <p>{{ product.stock }} in stock</p>
        <button (click)="addToCart(product)" [disabled]="product.stock === 0">
          Add to Cart
        </button>
      </div>
    } @else {
      <p>Loading...</p>
    }
  `,
})
export class ProductDetailComponent {
  private route = inject(ActivatedRoute);
  private productSvc = inject(ProductService);
  private cartSvc = inject(CartService);

  // Route param → HTTP call using switchMap.
  // If the user navigates from /products/1 to /products/2 without leaving
  // the component, switchMap cancels the first request and fires a new one.
  product$ = this.route.paramMap.pipe(
    switchMap(params => this.productSvc.getProduct(Number(params.get('id'))))
  );

  addToCart(product: any) {
    this.cartSvc.addToCart(product);
  }
}
