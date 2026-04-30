import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-order-confirmation',
  standalone: true,
  imports: [RouterLink],
  template: `
    <h1>Order Confirmed!</h1>
    <p>Your order has been placed successfully.</p>
    <a routerLink="/products">Continue shopping</a>
  `,
})
export class OrderConfirmationComponent {}
