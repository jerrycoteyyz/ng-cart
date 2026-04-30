export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  stock: number;
  rating: number;
}

// A union type used in filtering — shows TS integration throughout Angular
export type ProductCategory = 'electronics' | 'clothing' | 'books' | 'all';