import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { PosRepository, ProductRepository } from '../../core/data-access/repositories';
import { RequestState, requestState } from '../../core/data-access/request-state';
import {
  CartItem,
  CompleteSaleResult,
  PaymentMethod,
  PosWorkspace,
  Product,
} from '../../core/domain/models';
import { ConfirmationService } from '../../shared/feedback/confirmation';
import { DataState } from '../../shared/feedback/data-state';
import { ToastService } from '../../shared/feedback/toast';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-pos-page',
  imports: [FormsModule, Icon, DataState],
  templateUrl: './pos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosPage {
  private readonly productRepository = inject(ProductRepository);
  private readonly posRepository = inject(PosRepository);
  private readonly destroyRef = inject(DestroyRef);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(ToastService);
  private checkoutKey: string | null = null;
  private readonly paymentDialog = viewChild<ElementRef<HTMLElement>>('paymentDialog');

  readonly productState = signal<RequestState<readonly Product[]>>(requestState.loading());
  readonly products = computed(() => this.productState().data ?? []);
  readonly search = signal('');
  readonly selectedCategory = signal('All items');
  readonly cart = signal<CartItem[]>([]);
  readonly workspaceState = signal<RequestState<PosWorkspace>>(requestState.loading());
  readonly workspace = computed(() => this.workspaceState().data);
  readonly openingState = signal<RequestState<null>>(requestState.idle());
  readonly openingCash = signal(0);
  readonly saleState = signal<RequestState<CompleteSaleResult>>(requestState.idle());
  readonly lastSale = signal<CompleteSaleResult | null>(null);
  readonly paymentOpen = signal(false);
  readonly taxTreatment = signal<'INTRASTATE' | 'INTERSTATE'>('INTRASTATE');
  readonly placeOfSupplyStateCode = signal('33');
  readonly categories = computed(() => [
    'All items',
    ...new Set(this.products().map(({ category }) => category)),
  ]);
  readonly paymentMethods: readonly PaymentMethod[] = ['Cash', 'UPI', 'Card'];

  readonly filteredProducts = computed(() => {
    const query = this.search().trim().toLowerCase();
    const category = this.selectedCategory();
    return this.products().filter(
      (product) =>
        (category === 'All items' || product.category === category) &&
        (!query || `${product.name} ${product.sku}`.toLowerCase().includes(query)),
    );
  });

  readonly itemCount = computed(() => this.cart().reduce((sum, item) => sum + item.quantity, 0));
  readonly totals = computed(() =>
    this.cart().reduce(
      (summary, item) => {
        const gross = money(item.product.price * item.quantity);
        const rate = item.product.taxRate ?? 18;
        const inclusive = (item.product.priceTaxMode ?? 'INCLUSIVE') === 'INCLUSIVE';
        const taxable = inclusive ? money((gross * 100) / (100 + rate)) : gross;
        const tax = money(inclusive ? gross - taxable : (taxable * rate) / 100);
        return {
          taxable: money(summary.taxable + taxable),
          tax: money(summary.tax + tax),
          total: money(summary.total + taxable + tax),
        };
      },
      { taxable: 0, tax: 0, total: 0 },
    ),
  );
  readonly subtotal = computed(() => this.totals().taxable);
  readonly tax = computed(() => this.totals().tax);
  readonly total = computed(() => this.totals().total);

  constructor() {
    effect(() => {
      if (this.paymentOpen()) {
        window.setTimeout(() => this.paymentDialog()?.nativeElement.focus());
      }
    });
    this.loadProducts();
    this.loadWorkspace();
  }

  private loadProducts(): void {
    this.productState.set(requestState.loading());
    this.productRepository
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (products) => {
          this.productState.set(
            products.length ? requestState.success(products) : requestState.empty(products),
          );
        },
        error: (error: unknown) => this.productState.set(requestState.error(error)),
      });
  }

  private loadWorkspace(): void {
    this.workspaceState.set(requestState.loading());
    this.posRepository
      .getWorkspace()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (workspace) => this.workspaceState.set(requestState.success(workspace)),
        error: (error: unknown) => this.workspaceState.set(requestState.error(error)),
      });
  }

  @HostListener('document:keydown.escape')
  closePayment(): void {
    this.paymentOpen.set(false);
  }

  add(product: Product): void {
    if (product.stock < 1) return;
    this.invalidateCheckout();
    this.cart.update((items) => {
      const found = items.find((item) => item.product.id === product.id);
      if (found)
        return items.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
            : item,
        );
      return [...items, { product, quantity: 1 }];
    });
  }

  changeQuantity(productId: string, delta: number): void {
    this.invalidateCheckout();
    this.cart.update((items) =>
      items
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.min(item.product.stock, item.quantity + delta) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  remove(productId: string): void {
    this.invalidateCheckout();
    this.cart.update((items) => items.filter((item) => item.product.id !== productId));
  }

  async clearCart(): Promise<void> {
    if (!this.cart().length) return;
    const confirmed = await this.confirmation.confirm({
      title: 'Clear current order?',
      message: 'All items in this cart will be removed. This cannot be undone.',
      confirmLabel: 'Clear order',
      destructive: true,
    });
    if (confirmed) {
      this.invalidateCheckout();
      this.cart.set([]);
      this.toast.show('Current order cleared.');
    }
  }

  openRegister(): void {
    const warehouse = this.workspace()?.warehouse;
    if (!warehouse) {
      this.toast.error('No active branch warehouse is available for this register.');
      return;
    }
    this.openingState.set(requestState.loading());
    this.posRepository
      .openSession({ warehouseId: warehouse.id, openingCash: this.openingCash() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (workspace) => {
          this.workspaceState.set(requestState.success(workspace));
          this.openingState.set(requestState.success(null));
          this.toast.success(`${workspace.session?.registerCode ?? 'Register'} is open.`);
        },
        error: (error: unknown) => {
          const state = requestState.error<null>(error);
          this.openingState.set(state);
          this.toast.error(state.error ?? 'The register could not be opened.');
        },
      });
  }

  openPayment(): void {
    if (!this.workspace()?.session) {
      this.toast.error('Open the register before charging this order.');
      return;
    }
    this.checkoutKey ??= crypto.randomUUID();
    this.paymentOpen.set(true);
  }

  completeSale(method: PaymentMethod): void {
    const session = this.workspace()?.session;
    if (!session || !this.checkoutKey) {
      this.toast.error('Open the register before charging this order.');
      return;
    }
    this.saleState.set(requestState.loading());
    this.posRepository
      .completeSale({
        posSessionId: session.id,
        idempotencyKey: this.checkoutKey,
        taxTreatment: this.taxTreatment(),
        placeOfSupplyStateCode: this.placeOfSupplyStateCode(),
        items: this.cart(),
        paymentMethod: method,
        total: this.total(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.cart.set([]);
          this.checkoutKey = null;
          this.paymentOpen.set(false);
          this.saleState.set(requestState.success(result));
          this.lastSale.set(result);
          this.toast.success(
            `${result.invoiceNumber} posted with ${result.paymentMethod} payment and stock updated.`,
          );
          this.loadProducts();
          this.loadWorkspace();
        },
        error: (error: unknown) => {
          const state = requestState.error<CompleteSaleResult>(error);
          this.saleState.set(state);
          this.toast.error(state.error ?? 'The sale could not be completed. Retry is safe.');
        },
      });
  }

  private invalidateCheckout(): void {
    this.checkoutKey = null;
    this.saleState.set(requestState.idle());
  }
}

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
