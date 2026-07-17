import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { PurchaseRepository } from '../../core/data-access/repositories';
import { RequestState, requestState } from '../../core/data-access/request-state';
import { PurchaseBill, PurchaseWorkspace } from '../../core/domain/models';
import { ConfirmationService } from '../../shared/feedback/confirmation';
import { DataState } from '../../shared/feedback/data-state';
import { ToastService } from '../../shared/feedback/toast';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-purchases-page',
  imports: [FormsModule, DatePipe, DataState, Icon],
  templateUrl: './purchases.html',
  styleUrl: './purchases.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchasesPage {
  private readonly purchases = inject(PurchaseRepository);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly state = signal<RequestState<PurchaseWorkspace>>(requestState.loading());
  readonly busy = signal(false);
  readonly supplierId = signal('');
  readonly variantId = signal('');
  readonly reference = signal(`WEB-${new Date().getTime().toString().slice(-8)}`);
  readonly invoiceDate = signal(new Date().toISOString().slice(0, 10));
  readonly quantity = signal(1);
  readonly unitCost = signal(45);
  readonly taxRate = signal(5);
  readonly bills = computed(() => this.state().data?.bills ?? []);
  readonly totalOutstanding = computed(() =>
    this.bills().reduce((total, bill) => total + bill.outstandingAmount, 0),
  );

  constructor() {
    this.load();
  }

  createDraft(): void {
    const workspace = this.state().data;
    if (!workspace?.warehouse || !this.supplierId() || !this.variantId()) return;
    this.busy.set(true);
    this.purchases
      .createDraft({
        supplierId: this.supplierId(),
        warehouseId: workspace.warehouse.id,
        variantId: this.variantId(),
        reference: this.reference(),
        invoiceDate: this.invoiceDate(),
        quantity: this.quantity(),
        unitCost: this.unitCost(),
        taxRate: this.taxRate(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (bill) => {
          this.replaceBill(bill);
          this.reference.set(`WEB-${new Date().getTime().toString().slice(-8)}`);
          this.busy.set(false);
          this.toast.success(`Draft ${bill.reference} created with no stock effect.`);
        },
        error: (error: unknown) => this.operationError(error),
      });
  }

  async post(bill: PurchaseBill): Promise<void> {
    const confirmed = await this.confirmation.confirm({
      title: `Post ${bill.reference}?`,
      message: 'Posting is permanent and will add stock and supplier outstanding atomically.',
      confirmLabel: 'Post purchase',
    });
    if (!confirmed) return;
    this.busy.set(true);
    this.purchases
      .postBill(bill.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (posted) => {
          this.replaceBill(posted);
          this.busy.set(false);
          this.toast.success(`${posted.reference} posted and stock updated.`);
        },
        error: (error: unknown) => this.operationError(error),
      });
  }

  async pay(bill: PurchaseBill): Promise<void> {
    const confirmed = await this.confirmation.confirm({
      title: `Pay ₹${bill.outstandingAmount.toLocaleString('en-IN')}?`,
      message: 'This records an immutable bank payment allocated to the selected supplier bill.',
      confirmLabel: 'Record payment',
    });
    if (!confirmed) return;
    this.busy.set(true);
    this.purchases
      .payOutstanding(bill)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (paid) => {
          this.replaceBill(paid);
          this.busy.set(false);
          this.toast.success(`${paid.reference} is fully paid.`);
        },
        error: (error: unknown) => this.operationError(error),
      });
  }

  private load(): void {
    this.purchases
      .getWorkspace()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (workspace) => {
          this.state.set(requestState.success(workspace));
          this.supplierId.set(this.supplierId() || workspace.suppliers[0]?.id || '');
          this.variantId.set(this.variantId() || workspace.variants[0]?.id || '');
        },
        error: (error: unknown) => this.state.set(requestState.error(error)),
      });
  }

  private replaceBill(bill: PurchaseBill): void {
    const workspace = this.state().data;
    if (!workspace) return;
    const existing = workspace.bills.some(({ id }) => id === bill.id);
    this.state.set(
      requestState.success({
        ...workspace,
        bills: existing
          ? workspace.bills.map((current) => (current.id === bill.id ? bill : current))
          : [bill, ...workspace.bills],
      }),
    );
  }

  private operationError(error: unknown): void {
    this.busy.set(false);
    const message = error instanceof Error ? error.message : 'The purchase operation failed.';
    this.toast.error(message);
  }
}
