import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { PosRepository, ProductRepository } from '../../core/data-access/repositories';
import { MOCK_PRODUCTS } from '../../core/data-access/mock/mock-catalog';
import { CompleteSaleRequest } from '../../core/domain/models';
import { ToastService } from '../../shared/feedback/toast';
import { PosPage } from './pos';

describe('PosPage', () => {
  const workspace = {
    session: {
      id: 'session-1',
      registerCode: 'WEB-POS',
      status: 'OPEN' as const,
      openingCash: 0,
      cashSalesAmount: 0,
      openedAt: '2026-07-18T10:00:00.000Z',
    },
    warehouse: { id: 'warehouse-1', name: 'Main warehouse' },
  };

  function configure(
    completeSale: (request: CompleteSaleRequest) => ReturnType<PosRepository['completeSale']>,
    posWorkspace = workspace,
  ) {
    return TestBed.configureTestingModule({
      imports: [PosPage],
      providers: [
        { provide: ProductRepository, useValue: { list: () => of([MOCK_PRODUCTS[0]]) } },
        {
          provide: PosRepository,
          useValue: {
            getWorkspace: () => of(posWorkspace),
            openSession: () => of(workspace),
            completeSale,
          },
        },
      ],
    }).compileComponents();
  }

  it('adds products and constrains quantity to available stock', async () => {
    await configure(() =>
      of({
        invoiceNumber: 'WBL-0001',
        paymentMethod: 'Cash',
        totalAmount: 385,
        idempotent: false,
      }),
    );
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
      return of({
        invoiceNumber: 'WBL-0099',
        paymentMethod: request.paymentMethod,
        totalAmount: request.total,
        idempotent: false,
      });
    });
    const fixture = TestBed.createComponent(PosPage);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    const toast = TestBed.inject(ToastService);

    page.add(MOCK_PRODUCTS[0]);
    page.openPayment();
    page.completeSale('UPI');

    expect(submitted?.paymentMethod).toBe('UPI');
    expect(submitted?.posSessionId).toBe('session-1');
    expect(submitted?.idempotencyKey).toBeTruthy();
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
    page.openPayment();
    page.completeSale('Cash');

    expect(page.cart()).toHaveLength(1);
    expect(page.saleState().status).toBe('error');
    expect(toast.messages()[0]).toMatchObject({
      kind: 'error',
      message: 'Checkout API unavailable',
    });
  });

  it('opens a closed register before accepting checkout', async () => {
    let openingCash: number | undefined;
    await TestBed.configureTestingModule({
      imports: [PosPage],
      providers: [
        { provide: ProductRepository, useValue: { list: () => of([MOCK_PRODUCTS[0]]) } },
        {
          provide: PosRepository,
          useValue: {
            getWorkspace: () => of({ ...workspace, session: null }),
            openSession: (request: { openingCash: number }) => {
              openingCash = request.openingCash;
              return of(workspace);
            },
            completeSale: () =>
              of({
                invoiceNumber: 'WBL-0100',
                paymentMethod: 'Cash',
                totalAmount: 385,
                idempotent: false,
              }),
          },
        },
      ],
    }).compileComponents();
    const page = TestBed.createComponent(PosPage).componentInstance;
    page.openingCash.set(500);
    page.openRegister();

    expect(openingCash).toBe(500);
    expect(page.workspace()?.session?.registerCode).toBe('WEB-POS');
    expect(page.openingState().status).toBe('success');
  });

  it('calculates exclusive GST totals using product tax metadata', async () => {
    const product = {
      ...MOCK_PRODUCTS[0],
      price: 60,
      taxRate: 5,
      priceTaxMode: 'EXCLUSIVE' as const,
    };
    await TestBed.configureTestingModule({
      imports: [PosPage],
      providers: [
        { provide: ProductRepository, useValue: { list: () => of([product]) } },
        {
          provide: PosRepository,
          useValue: {
            getWorkspace: () => of(workspace),
            openSession: () => of(workspace),
            completeSale: () =>
              of({
                invoiceNumber: 'WBL-0101',
                paymentMethod: 'Cash',
                totalAmount: 63,
                idempotent: false,
              }),
          },
        },
      ],
    }).compileComponents();
    const page = TestBed.createComponent(PosPage).componentInstance;
    page.add(product);

    expect(page.subtotal()).toBe(60);
    expect(page.tax()).toBe(3);
    expect(page.total()).toBe(63);
  });
});
