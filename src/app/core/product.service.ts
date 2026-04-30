import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Product, ProductCategory } from '../models/product.model';

export interface ProductsResponse {
  data: Product[];
  total: number;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);

  getProducts(category: ProductCategory = 'all', search = ''): Observable<ProductsResponse> {
    let params = new HttpParams();
    if (category !== 'all') params = params.set('category', category);
    if (search)             params = params.set('search', search);
    return this.http.get<ProductsResponse>('/api/products', { params });
  }

  getProduct(id: number): Observable<Product> {
    return this.http.get<{ product: Product }>(`/api/products/${id}`).pipe(
      map(r => r.product),
    );
  }
}
