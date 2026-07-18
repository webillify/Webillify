import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { PosRepository } from '../repositories';
import { provideDataAccess } from '../provide-data-access';
import { ApiSessionStore } from './api-session';

describe('ApiPosRepository', () => {
  let repository: PosRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideDataAccess({ production: false, dataMode: 'api', apiBaseUrl: '/api/v1' }),
      ],
    });
    TestBed.inject(ApiSessionStore).save({
      accessToken: 'access-token',
      accessExpiresAt: '2099-01-01T00:00:00.000Z',
      remember: false,
      session: {
        user: {
          id: 'user-1',
          displayName: 'Cashier',
          email: 'cashier@example.com',
          role: 'Cashier',
          permissions: ['pos.create'],
        },
        expiresAt: '2099-01-01T00:00:00.000Z',
        mode: 'api',
        workspace: {
          organizationId: 'organization-1',
          organizationName: 'Test Retail',
          branchId: 'branch-1',
          branchName: 'Main',
        },
      },
    });
    repository = TestBed.inject(PosRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.inject(ApiSessionStore).clear();
    TestBed.resetTestingModule();
  });

  it('loads the WEB-POS session and branch warehouse', async () => {
    const result = firstValueFrom(repository.getWorkspace());
    http.expectOne('/api/v1/pos-sessions').flush([apiSession]);
    http.expectOne('/api/v1/stock-balances').flush([apiBalance]);

    await expect(result).resolves.toEqual({
      session: expect.objectContaining({ id: 'session-1', registerCode: 'WEB-POS' }),
      warehouse: { id: 'warehouse-1', name: 'Main warehouse' },
    });
  });

  it('opens a register with a unique request identity and refreshes workspace state', async () => {
    const result = firstValueFrom(
      repository.openSession({ warehouseId: 'warehouse-1', openingCash: 500 }),
    );
    const opening = http.expectOne('/api/v1/pos-sessions/open');
    expect(opening.request.headers.get('Idempotency-Key')).toBeTruthy();
    expect(opening.request.body).toEqual({
      branchId: 'branch-1',
      warehouseId: 'warehouse-1',
      registerCode: 'WEB-POS',
      openingCash: 500,
    });
    opening.flush({ session: apiSession });
    http.expectOne('/api/v1/pos-sessions').flush([apiSession]);
    http.expectOne('/api/v1/stock-balances').flush([apiBalance]);

    await expect(result).resolves.toEqual(
      expect.objectContaining({ session: expect.objectContaining({ id: 'session-1' }) }),
    );
  });

  it('recovers a concurrent register-open conflict by loading the winning session', async () => {
    const result = firstValueFrom(
      repository.openSession({ warehouseId: 'warehouse-1', openingCash: 0 }),
    );
    http
      .expectOne('/api/v1/pos-sessions/open')
      .flush(
        { error: { code: 'POS_SESSION_ALREADY_OPEN' } },
        { status: 409, statusText: 'Conflict' },
      );
    http.expectOne('/api/v1/pos-sessions').flush([apiSession]);
    http.expectOne('/api/v1/stock-balances').flush([apiBalance]);

    await expect(result).resolves.toEqual(
      expect.objectContaining({ session: expect.objectContaining({ id: 'session-1' }) }),
    );
  });

  it('posts the server-checked cart with the caller retry identity', async () => {
    const result = firstValueFrom(
      repository.completeSale({
        posSessionId: 'session-1',
        idempotencyKey: 'checkout-1',
        taxTreatment: 'INTRASTATE',
        placeOfSupplyStateCode: '33',
        items: [
          {
            quantity: 1,
            product: {
              id: 'variant-1',
              name: 'Premium Rice',
              sku: 'RICE-1KG',
              category: 'Grocery',
              price: 60,
              stock: 100,
              unit: 'kg',
              color: '#fff',
              initials: 'PR',
              taxRate: 5,
              priceTaxMode: 'EXCLUSIVE',
            },
          },
        ],
        paymentMethod: 'Cash',
        total: 63,
      }),
    );
    const posting = http.expectOne('/api/v1/sales-invoices/post');
    expect(posting.request.headers.get('Idempotency-Key')).toBe('checkout-1');
    expect(posting.request.body).toEqual({
      posSessionId: 'session-1',
      taxTreatment: 'INTRASTATE',
      placeOfSupplyStateCode: '33',
      expectedTotal: 63,
      items: [{ variantId: 'variant-1', quantity: 1 }],
      payments: [{ method: 'CASH', amount: 63 }],
    });
    posting.flush({
      invoice: {
        id: 'invoice-1',
        displayNumber: 'WBL-00001',
        invoiceDate: '2026-07-18T10:00:00.000Z',
        totalAmount: '63',
        paidAmount: '63',
        outstandingAmount: '0',
        customer: null,
      },
      idempotent: false,
    });

    await expect(result).resolves.toEqual({
      invoiceNumber: 'WBL-00001',
      paymentMethod: 'Cash',
      totalAmount: 63,
      idempotent: false,
    });
  });
});

const apiSession = {
  id: 'session-1',
  branchId: 'branch-1',
  warehouseId: 'warehouse-1',
  registerCode: 'WEB-POS',
  status: 'OPEN',
  openingCash: '500',
  cashSalesAmount: '63',
  openedAt: '2026-07-18T10:00:00.000Z',
};

const apiBalance = {
  quantity: '99',
  variant: { id: 'variant-1' },
  warehouse: { id: 'warehouse-1', name: 'Main warehouse', branchId: 'branch-1' },
};
