import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { PosRepository, ProductRepository } from '../../core/data-access/repositories';
import { MOCK_PRODUCTS } from '../../core/data-access/mock/mock-catalog';
import { CompleteSaleRequest } from '../../core/domain/models';
import { ToastService } from '../../shared/feedback/toast';
import { PosPage } from './pos';

describe('PosPage', () => {
  function configure(
    completeSale: (request: CompleteSaleRequest) => ReturnType<PosRepository['completeSale']>,
  ) {
    return TestBed.configureTestingModule({
      imports: [PosPage],
      providers: [
        { provide: ProductRepository, useValue: { list: () => of([MOCK_PRODUCTS[0]]) } },
        { provide: PosRepository, useValue: { completeSale } },
      ],
    }).compileComponents();
  }

  it('adds products and constrains quantity to available stock', async () => {
    await configure(() => of({ invoiceNumber: 'WBL-0001', paymentMethod: 'Cash' }));
    const fixture = TestBed.createComponent(PosPage);
    fixture.detectChanges();
    const page = fixture.componentInstance;

    page.add(MOCK_PRODUCTS[0]);
    page.changeQuantity(MOCK_PRODUCTS[0].id, 100);

    expect(page.cart()[0].quantity).toBe(MOCK_PRODUCTS[0].stock);
    expect(page.total()).toBe(MOCK_PRODUCTS[0].price * MOCK_PRODUCTS[0].stock);
  });

  it('completes a sale, clears the cart and publishes success feedback', async () => {
    let submitted: CompleteSaleRequest | undefined;
    await configure((request) => {
      submitted = request;
      return of({ invoiceNumber: 'WBL-0099', paymentMethod: request.paymentMethod });
    });
    const fixture = TestBed.createComponent(PosPage);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    const toast = TestBed.inject(ToastService);

    page.add(MOCK_PRODUCTS[0]);
    page.completeSale('UPI');

    expect(submitted?.paymentMethod).toBe('UPI');
    expect(page.cart()).toEqual([]);
    expect(page.saleState().status).toBe('success');
    expect(toast.messages()[0].message).toContain('WBL-0099');
  });

  it('keeps the cart and exposes checkout failures', async () => {
    await configure(() => throwError(() => new Error('Checkout API unavailable')));
    const fixture = TestBed.createComponent(PosPage);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    const toast = TestBed.inject(ToastService);

    page.add(MOCK_PRODUCTS[0]);
    page.completeSale('Cash');

    expect(page.cart()).toHaveLength(1);
    expect(page.saleState().status).toBe('error');
    expect(toast.messages()[0]).toMatchObject({
      kind: 'error',
      message: 'Checkout API unavailable',
    });
  });
});
