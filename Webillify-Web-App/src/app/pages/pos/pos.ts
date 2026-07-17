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
import { CartItem, PaymentMethod, Product } from '../../core/domain/models';
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
  private cartInitialized = false;
  private readonly paymentDialog = viewChild<ElementRef<HTMLElement>>('paymentDialog');

  readonly productState = signal<RequestState<readonly Product[]>>(requestState.loading());
  readonly products = computed(() => this.productState().data ?? []);
  readonly search = signal('');
  readonly selectedCategory = signal('All items');
  readonly cart = signal<CartItem[]>([]);
  readonly saleState = signal<RequestState<null>>(requestState.idle());
  readonly paymentOpen = signal(false);
  readonly categories = ['All items', 'Grocery', 'Appliances', 'Personal care', 'Home care'];
  readonly paymentMethods: readonly PaymentMethod[] = ['Cash', 'UPI', 'Card', 'Credit'];

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
  readonly total = computed(() =>
    this.cart().reduce((sum, item) => sum + item.product.price * item.quantity, 0),
  );
  readonly subtotal = computed(() => this.total() / 1.18);
  readonly tax = computed(() => this.total() - this.subtotal());

  constructor() {
    effect(() => {
      if (this.paymentOpen()) {
        window.setTimeout(() => this.paymentDialog()?.nativeElement.focus());
      }
    });
    this.productRepository
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (products) => {
          this.productState.set(
            products.length ? requestState.success(products) : requestState.empty(products),
          );
          if (!this.cartInitialized && products.length >= 6) {
            this.cart.set([
              { product: products[0], quantity: 2 },
              { product: products[5], quantity: 1 },
            ]);
            this.cartInitialized = true;
          }
        },
        error: (error: unknown) => this.productState.set(requestState.error(error)),
      });
  }

  @HostListener('document:keydown.escape')
  closePayment(): void {
    this.paymentOpen.set(false);
  }

  add(product: Product): void {
    if (product.stock < 1) return;
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
      this.cart.set([]);
      this.toast.show('Current order cleared.');
    }
  }

  completeSale(method: PaymentMethod): void {
    this.saleState.set(requestState.loading());
    this.posRepository
      .completeSale({ items: this.cart(), paymentMethod: method, total: this.total() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.cart.set([]);
          this.paymentOpen.set(false);
          this.saleState.set(requestState.success(null));
          this.toast.success(
            `${result.invoiceNumber} recorded as ${result.paymentMethod} payment in this demo.`,
          );
        },
        error: (error: unknown) => {
          const state = requestState.error<null>(error);
          this.saleState.set(state);
          this.toast.error(state.error ?? 'The demo sale could not be completed.');
        },
      });
  }
}
