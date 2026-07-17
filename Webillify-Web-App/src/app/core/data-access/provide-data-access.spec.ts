import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { ProductRepository } from './repositories';
import { provideDataAccess } from './provide-data-access';

describe('provideDataAccess', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('uses mock repositories when mock mode is selected', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideDataAccess({ production: false, dataMode: 'mock', apiBaseUrl: '/api/v1' }),
      ],
    });

    const products = await firstValueFrom(TestBed.inject(ProductRepository).list());
    expect(products.length).toBeGreaterThan(0);
  });

  it('uses real product and stock endpoints instead of mock data in API mode', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideDataAccess({ production: false, dataMode: 'api', apiBaseUrl: '/api/v1' }),
      ],
    });

    const result = firstValueFrom(TestBed.inject(ProductRepository).list());
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/products').flush([
      {
        id: 'product-1',
        name: 'Premium Rice',
        category: { name: 'Grocery' },
        baseUnit: { symbol: 'kg' },
        variants: [{ id: 'variant-1', sku: 'RICE-1KG', name: '1 kg', salePrice: '60.00' }],
      },
    ]);
    http.expectOne('/api/v1/stock-balances').flush([
      { quantity: '100.000', variant: { id: 'variant-1' } },
    ]);

    await expect(result).resolves.toEqual([
      expect.objectContaining({ id: 'variant-1', sku: 'RICE-1KG', stock: 100, price: 60 }),
    ]);
    http.verify();
  });
});
