import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthStore } from '../../core/auth/auth.store';
import { SalesRepository } from '../../core/data-access/repositories';
import { RequestState, requestState } from '../../core/data-access/request-state';
import {
  RefundMethod,
  SalesInvoice,
  SalesInvoiceDetail,
  SalesWorkspace,
} from '../../core/domain/models';
import { DataState } from '../../shared/feedback/data-state';
import { ToastService } from '../../shared/feedback/toast';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-sales-page',
  imports: [DatePipe, FormsModule, DataState, Icon],
  templateUrl: './sales.html',
  styleUrl: './sales.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesPage {
  private readonly sales = inject(SalesRepository);
  private readonly auth = inject(AuthStore);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly state = signal<RequestState<SalesWorkspace>>(requestState.loading());
  readonly busy = signal(false);
  readonly detail = signal<SalesInvoiceDetail | null>(null);
  readonly action = signal<'return' | 'cancel' | null>(null);
  readonly reason = signal('');
  readonly refundMethod = signal<RefundMethod>('CASH');
  readonly quantities = signal<Record<string, number>>({});
  readonly idempotencyKey = signal('');
  readonly canManage = computed(() => this.auth.hasPermission('pos.create'));
  readonly invoices = computed(() => this.state().data?.invoices ?? []);
  readonly netSales = computed(() =>
    this.invoices().reduce(
      (total, invoice) => total + invoice.totalAmount - invoice.returnedAmount,
      0,
    ),
  );

  constructor() {
    this.load();
  }

  start(invoice: SalesInvoice, action: 'return' | 'cancel'): void {
    this.busy.set(true);
    this.sales
      .getInvoice(invoice.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) => {
          this.detail.set(detail);
          this.action.set(action);
          this.reason.set('');
          this.refundMethod.set('CASH');
          this.idempotencyKey.set(crypto.randomUUID());
          this.quantities.set(
            Object.fromEntries(
              detail.items
                .filter(({ remainingQuantity }) => remainingQuantity > 0)
                .map((item) => [item.id, item.remainingQuantity]),
            ),
          );
          this.busy.set(false);
        },
        error: (error: unknown) => this.operationError(error),
      });
  }

  close(): void {
    this.detail.set(null);
    this.action.set(null);
    this.reason.set('');
    this.quantities.set({});
    this.idempotencyKey.set('');
  }

  setQuantity(itemId: string, value: number): void {
    this.quantities.update((current) => ({ ...current, [itemId]: value }));
  }

  submit(): void {
    const invoice = this.detail();
    const action = this.action();
    const reason = this.reason().trim();
    if (!invoice || !action || reason.length < 5 || !this.idempotencyKey()) return;
    this.busy.set(true);
    const request = {
      invoice,
      reason,
      refundMethod: this.refundMethod(),
      idempotencyKey: this.idempotencyKey(),
      quantities: this.quantities(),
    };
    const operation =
      action === 'cancel' ? this.sales.cancelInvoice(request) : this.sales.createReturn(request);
    operation.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updated) => {
        this.replace(updated);
        this.busy.set(false);
        this.close();
        this.toast.success(
          action === 'cancel'
            ? `${updated.invoiceNumber} cancelled, refunded and restocked.`
            : `${updated.invoiceNumber} return posted and projections refreshed.`,
        );
      },
      error: (error: unknown) => this.operationError(error),
    });
  }

  canCompensate(invoice: SalesInvoice): boolean {
    return (
      this.canManage() &&
      invoice.status === 'POSTED' &&
      invoice.returnedAmount < invoice.totalAmount
    );
  }

  private load(): void {
    this.sales
      .getWorkspace()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (workspace) => this.state.set(requestState.success(workspace)),
        error: (error: unknown) => this.state.set(requestState.error(error)),
      });
  }

  private replace(invoice: SalesInvoice): void {
    const workspace = this.state().data;
    if (!workspace) return;
    this.state.set(
      requestState.success({
        ...workspace,
        invoices: workspace.invoices.map((current) =>
          current.id === invoice.id ? invoice : current,
        ),
      }),
    );
  }

  private operationError(error: unknown): void {
    this.busy.set(false);
    this.toast.error(error instanceof Error ? error.message : 'The sales operation failed.');
  }
}
