import { firstValueFrom } from 'rxjs';
import { MockPosRepository, MockProductRepository } from './mock.repositories';

describe('mock data repositories', () => {
  it('returns the current product catalogue', async () => {
    const products = await firstValueFrom(new MockProductRepository().list());

    expect(products).toHaveLength(12);
    expect(products[0]).toMatchObject({ id: 'prd-001', sku: 'ORG-HNY-500' });
  });

  it('rejects an empty sale without creating an invoice', async () => {
    const repository = new MockPosRepository();

    await expect(
      firstValueFrom(repository.completeSale({ items: [], paymentMethod: 'Cash', total: 0 })),
    ).rejects.toThrow('A sale requires at least one item');
  });
});
