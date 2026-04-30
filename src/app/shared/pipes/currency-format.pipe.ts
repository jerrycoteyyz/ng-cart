import { Pipe, PipeTransform } from '@angular/core';

// Pure pipe (default): re-runs only when input value reference changes.
// Impure pipe (pure: false): re-runs on every change detection cycle — avoid unless necessary.
@Pipe({
  name: 'currencyFormat',
  standalone: true, // declare as standalone so any component can import it directly
})
export class CurrencyFormatPipe implements PipeTransform {
  // args[] lets you pass extra params: {{ price | currencyFormat:'EUR':'symbol-narrow' }}
  transform(value: number, currency = 'USD', display: 'symbol' | 'code' = 'symbol'): string {
    if (value == null) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      currencyDisplay: display,
    }).format(value);
  }
}

// Usage in template:
// {{ product.price | currencyFormat }}           → $29.99
// {{ product.price | currencyFormat:'EUR' }}     → €29.99