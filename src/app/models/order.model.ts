import { CartItem } from './cart.model';

export interface ShippingAddress {
  fullName: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface Order {
  id: string;
  items: CartItem[];
  shipping: ShippingAddress;
  paymentLast4: string;
  total: number;
  createdAt: Date;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
}