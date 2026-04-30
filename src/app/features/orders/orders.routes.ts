import { Routes } from '@angular/router';

// This file demonstrates loadChildren — a sub-router for a feature area.
// app.routes.ts lazy-loads this entire Routes array as a separate chunk.
export const ordersRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./order-list/order-list.component').then(m => m.OrderListComponent),
  },
  {
    path: 'confirmation',
    loadComponent: () =>
      import('./order-confirmation/order-confirmation.component')
        .then(m => m.OrderConfirmationComponent),
  },
];
