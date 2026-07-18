import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { SalesRepository } from '../repositories';
import { provideDataAccess } from '../provide-data-access';
import { ApiSessionStore } from './api-session';

describe('ApiSalesRepository', () => {
  let repository: SalesRepository;
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
          organizationName: 'Test',
          branchId: 'branch-1',
          branchName: 'Main',
        },
      },
    });
    repository = TestBed.inject(SalesRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.inject(ApiSessionStore).clear();
    TestBed.resetTestingModule();
  });

  it('maps invoice compensation projections and active register', async () => {
    const result = firstValueFrom(repository.getWorkspace());
    http.expectOne('/api/v1/sales-invoices').flush([apiInvoice]);
    http.expectOne('/api/v1/pos-sessions').flush([apiSession]);
    await expect(result).resolves.toEqual({
      invoices: [expect.objectContaining({ invoiceNumber: 'WBL-00001', returnedAmount: 0 })],
      openPosSessionId: 'session-1',
      registerCode: 'WEB-POS',
    });
  });

  it('maps remaining return quantities from linked ledger items', async () => {
    const result = firstValueFrom(repository.getInvoice('invoice-1'));
    http.expectOne('/api/v1/sales-invoices/invoice-1').flush({
      ...apiInvoice,
      items: [{ id: 'item-1', description: 'Premium Rice', quantity: '2', lineTotal: '126' }],
      returns: [{ items: [{ salesInvoiceItemId: 'item-1', quantity: '0.5' }] }],
    });
    await expect(result).resolves.toEqual(
      expect.objectContaining({
        items: [expect.objectContaining({ returnedQuantity: 0.5, remainingQuantity: 1.5 })],
      }),
    );
  });

  it('posts selected return quantities with the caller retry identity', async () => {
    const detail = {
      id: 'invoice-1',
      invoiceNumber: 'WBL-00001',
      invoiceDate: apiInvoice.invoiceDate,
      status: 'POSTED' as const,
      customerName: 'Walk-in customer',
      totalAmount: 126,
      paidAmount: 126,
      returnedAmount: 0,
      refundedAmount: 0,
      outstandingAmount: 0,
      items: [
        {
          id: 'item-1',
          description: 'Premium Rice',
          quantity: 2,
          returnedQuantity: 0,
          remainingQuantity: 2,
          lineTotal: 126,
        },
      ],
    };
    const result = firstValueFrom(
      repository.createReturn({
        invoice: detail,
        reason: 'Customer returned one item',
        refundMethod: 'CASH',
        idempotencyKey: 'return-1',
        quantities: { 'item-1': 1 },
      }),
    );
    http.expectOne('/api/v1/sales-invoices').flush([apiInvoice]);
    http.expectOne('/api/v1/pos-sessions').flush([apiSession]);
    const posting = http.expectOne('/api/v1/sales-returns');
    expect(posting.request.headers.get('Idempotency-Key')).toBe('return-1');
    expect(posting.request.body).toEqual(
      expect.objectContaining({
        salesInvoiceId: 'invoice-1',
        posSessionId: 'session-1',
        refundMethod: 'CASH',
        items: [{ salesInvoiceItemId: 'item-1', quantity: 1 }],
      }),
    );
    posting.flush({ invoice: { ...apiInvoice, returnedAmount: '63', refundedAmount: '63' } });
    await expect(result).resolves.toEqual(expect.objectContaining({ returnedAmount: 63 }));
  });
});

const apiSession = {
  id: 'session-1',
  branchId: 'branch-1',
  warehouseId: 'warehouse-1',
  registerCode: 'WEB-POS',
  status: 'OPEN',
  openingCash: '0',
  cashSalesAmount: '126',
  openedAt: '2026-07-18T10:00:00.000Z',
};
const apiInvoice = {
  id: 'invoice-1',
  displayNumber: 'WBL-00001',
  invoiceDate: '2026-07-18T10:00:00.000Z',
  status: 'POSTED',
  totalAmount: '126',
  paidAmount: '126',
  returnedAmount: '0',
  refundedAmount: '0',
  outstandingAmount: '0',
  customer: null,
};
