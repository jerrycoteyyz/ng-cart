import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <h1>404 — Page not found</h1>
    <p>The page you're looking for doesn't exist.</p>
    <a routerLink="/products">Go to shop</a>
  `,
})
export class NotFoundComponent {}
