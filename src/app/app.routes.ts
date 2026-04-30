import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'products',
    pathMatch: 'full',  // 'full' = only match empty path exactly (not prefix match)
  },
  {
    path: 'products',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/products/product-list/product-list.component')
        .then(m => m.ProductListComponent),
  },
  {
    path: 'products/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/products/product-detail/product-detail.component')
        .then(m => m.ProductDetailComponent),
  },
  {
    path: 'cart',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/cart/cart.component').then(m => m.CartComponent),
  },
  {
    path: 'checkout',
    canActivate: [authGuard],  // guard runs before component loads
    loadComponent: () =>
      import('./features/checkout/checkout.component')
        .then(m => m.CheckoutComponent),
  },
  {
    path: 'reports',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/reports/reports.component').then(m => m.ReportsComponent),
  },
  {
    path: 'payment',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/payment/payment.component').then(m => m.PaymentComponent),
  },
  {
    path: 'login',
    canActivate: [guestGuard], // redirect logged-in users away from login
    loadComponent: () =>
      import('./features/auth/login/login.component')
        .then(m => m.LoginComponent),
  },
  {
    path: 'orders',
    canActivate: [authGuard],
    // loadChildren: lazy-load an entire sub-router (a Routes array)
    // Good for large feature areas with multiple sub-routes
    loadChildren: () =>
      import('./features/orders/orders.routes').then(m => m.ordersRoutes),
  },
  {
    path: '**',             // wildcard — catches all unmatched routes
    loadComponent: () =>
      import('./shared/components/not-found/not-found.component')
        .then(m => m.NotFoundComponent),
  },
];