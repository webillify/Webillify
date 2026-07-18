import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthStore } from '../../core/auth/auth.store';
import { SalesRepository } from '../../core/data-access/repositories';
import {
  SalesCompensationRequest,
  SalesInvoiceDetail,
  SalesWorkspace,
} from '../../core/domain/models';
import { ToastService } from '../../shared/feedback/toast';
import { SalesPage } from './sales';

describe('SalesPage', () => {
  const invoice: SalesInvoiceDetail = {
    id: 'invoice-1',
    invoiceNumber: 'WBL-00001',
    invoiceDate: '2026-07-18T10:00:00.000Z',
    status: 'POSTED',
    customerName: 'Walk-in customer',
    totalAmount: 63,
    paidAmount: 63,
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
        lineTotal: 63,
      },
    ],
  };
  const workspace: SalesWorkspace = {
    invoices: [invoice],
    openPosSessionId: 'session-1',
    registerCode: 'WEB-POS',
  };

  function configure(repository: object, canManage = true) {
    return TestBed.configureTestingModule({
      imports: [SalesPage],
      providers: [
        { provide: SalesRepository, useValue: repository },
        { provide: AuthStore, useValue: { hasPermission: () => canManage } },
      ],
    }).compileComponents();
  }

  it('renders reconciled sales and hides actions from read-only users', async () => {
    await configure({ getWorkspace: () => of(workspace) }, false);
    const fixture = TestBed.createComponent(SalesPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('WBL-00001');
    expect(element.textContent).toContain('₹63');
    expect(element.querySelectorAll('.invoice-actions button')).toHaveLength(0);
  });

  it('loads remaining lines and submits selected return quantities', async () => {
    let submitted: SalesCompensationRequest | undefined;
    await configure({
      getWorkspace: () => of(workspace),
      getInvoice: () => of(invoice),
      createReturn: (request: SalesCompensationRequest) => {
        submitted = request;
        return of({ ...invoice, returnedAmount: 31.5, refundedAmount: 31.5 });
      },
    });
    const fixture = TestBed.createComponent(SalesPage);
    fixture.detectChanges();
    const page = fixture.componentInstance;

    page.start(invoice, 'return');
    page.setQuantity('item-1', 1);
    page.reason.set('Customer returned one sealed unit');
    page.submit();

    expect(submitted?.quantities).toEqual({ 'item-1': 1 });
    expect(submitted?.idempotencyKey).toBeTruthy();
    expect(page.invoices()[0].returnedAmount).toBe(31.5);
    expect(TestBed.inject(ToastService).messages()[0].message).toContain('return posted');
  });

  it('submits cancellation with a stable action identity', async () => {
    let submitted: SalesCompensationRequest | undefined;
    await configure({
      getWorkspace: () => of(workspace),
      getInvoice: () => of(invoice),
      cancelInvoice: (request: SalesCompensationRequest) => {
        submitted = request;
        return of({
          ...invoice,
          status: 'CANCELLED' as const,
          returnedAmount: 63,
          refundedAmount: 63,
        });
      },
    });
    const fixture = TestBed.createComponent(SalesPage);
    fixture.detectChanges();
    const page = fixture.componentInstance;

    page.start(invoice, 'cancel');
    const key = page.idempotencyKey();
    page.reason.set('Invoice was posted by mistake');
    page.refundMethod.set('UPI');
    page.submit();

    expect(submitted).toEqual(
      expect.objectContaining({ idempotencyKey: key, refundMethod: 'UPI' }),
    );
    expect(page.invoices()[0].status).toBe('CANCELLED');
  });
});
