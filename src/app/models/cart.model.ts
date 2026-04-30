import { Product } from './product.model';

export interface CartItem {
  product: Product;
  quantity: number;
}

// Derived values computed in the service, not stored in state
export interface CartSummary {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  tax: number;
  total: number;
}