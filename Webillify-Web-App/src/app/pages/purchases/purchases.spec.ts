import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthStore } from '../../core/auth/auth.store';
import { PurchaseRepository } from '../../core/data-access/repositories';
import {
  PurchaseBill,
  PurchaseCompensationRequest,
  PurchaseWorkspace,
} from '../../core/domain/models';
import { ToastService } from '../../shared/feedback/toast';
import { PurchasesPage } from './purchases';

describe('PurchasesPage', () => {
  const cancellableBill: PurchaseBill = {
    id: 'bill-cancellable',
    supplierId: 'supplier-1',
    supplierName: 'Demo Supplier',
    reference: 'INV-CANCEL',
    invoiceDate: '2026-07-17',
    status: 'POSTED',
    totalAmount: 95,
    paidAmount: 0,
    returnedAmount: 0,
    outstandingAmount: 95,
  };
  const paidBill: PurchaseBill = {
    ...cancellableBill,
    id: 'bill-paid',
    reference: 'INV-PAID',
    paidAmount: 95,
    outstandingAmount: 0,
  };
  const returnedBill: PurchaseBill = {
    ...cancellableBill,
    id: 'bill-returned',
    reference: 'INV-RETURNED',
    returnedAmount: 95,
    outstandingAmount: 0,
  };
  const workspace: PurchaseWorkspace = {
    suppliers: [
      { id: 'supplier-1', code: 'SUP-1', name: 'Demo Supplier', gstin: null, creditDays: 0 },
    ],
    bills: [cancellableBill, paidBill, returnedBill],
    variants: [{ id: 'variant-1', label: 'Premium Rice', sku: 'RICE-1' }],
    warehouse: { id: 'warehouse-1', name: 'Main Warehouse' },
  };

  function configure(repository: object, canManage = true) {
    return TestBed.configureTestingModule({
      imports: [PurchasesPage],
      providers: [
        { provide: PurchaseRepository, useValue: repository },
        { provide: AuthStore, useValue: { hasPermission: () => canManage } },
      ],
    }).compileComponents();
  }

  it('shows only backend-safe compensation actions', async () => {
    await configure({ getWorkspace: () => of(workspace) });
    const fixture = TestBed.createComponent(PurchasesPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('button[aria-label^="Cancel bill"]')).toHaveLength(1);
    expect(element.querySelectorAll('button[aria-label^="Return remaining"]')).toHaveLength(2);
    expect(element.textContent).toContain('Returned in full');
  });

  it('renders a read-only workspace without mutation actions', async () => {
    await configure({ getWorkspace: () => of(workspace) }, false);
    const fixture = TestBed.createComponent(PurchasesPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('.bill-actions button')).toHaveLength(0);
    expect(
      element.querySelector<HTMLButtonElement>('form.purchase-form button[type="submit"]')
        ?.disabled,
    ).toBe(true);
    expect(element.textContent).toContain('read-only purchase access');
  });

  it('records a cancellation reason and replaces the bill projection', async () => {
    let submitted: PurchaseCompensationRequest | undefined;
    await configure({
      getWorkspace: () => of(workspace),
      cancelBill: (request: PurchaseCompensationRequest) => {
        submitted = request;
        return of({
          ...request.bill,
          status: 'CANCELLED' as const,
          outstandingAmount: 0,
        });
      },
    });
    const fixture = TestBed.createComponent(PurchasesPage);
    fixture.detectChanges();
    const page = fixture.componentInstance;

    page.startCompensation(cancellableBill, 'cancel');
    page.compensationReason.set('Supplier bill was entered in error');
    page.submitCompensation(cancellableBill);

    expect(submitted?.reason).toBe('Supplier bill was entered in error');
    expect(page.bills().find(({ id }) => id === cancellableBill.id)?.status).toBe('CANCELLED');
    expect(page.compensation()).toBeNull();
    expect(TestBed.inject(ToastService).messages()[0].message).toContain('cancelled');
  });

  it('posts the remaining return through the repository', async () => {
    let submitted: PurchaseCompensationRequest | undefined;
    await configure({
      getWorkspace: () => of(workspace),
      returnRemaining: (request: PurchaseCompensationRequest) => {
        submitted = request;
        return of({
          ...request.bill,
          returnedAmount: request.bill.totalAmount,
          outstandingAmount: 0,
        });
      },
    });
    const fixture = TestBed.createComponent(PurchasesPage);
    fixture.detectChanges();
    const page = fixture.componentInstance;

    page.startCompensation(cancellableBill, 'return');
    page.compensationReason.set('All remaining items were rejected');
    page.submitCompensation(cancellableBill);

    expect(submitted?.bill.id).toBe(cancellableBill.id);
    expect(page.bills().find(({ id }) => id === cancellableBill.id)?.returnedAmount).toBe(95);
    expect(TestBed.inject(ToastService).messages()[0].message).toContain('return posted');
  });
});
