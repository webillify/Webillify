import { TestBed } from '@angular/core/testing';
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

  it('fails explicitly instead of falling back to mock data in API mode', async () => {
    TestBed.configureTestingModule({
      providers: [provideDataAccess({ production: false, dataMode: 'api', apiBaseUrl: '/api/v1' })],
    });

    await expect(firstValueFrom(TestBed.inject(ProductRepository).list())).rejects.toThrow(
      'API data mode is selected',
    );
  });
});
