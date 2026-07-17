import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ProductRepository } from '../../core/data-access/repositories';
import { RequestState, requestState } from '../../core/data-access/request-state';
import { Product } from '../../core/domain/models';
import { DataState } from '../../shared/feedback/data-state';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-products-page',
  imports: [FormsModule, Icon, DataState],
  templateUrl: './products.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsPage {
  private readonly productRepository = inject(ProductRepository);

  readonly search = signal('');
  readonly state = signal<RequestState<readonly Product[]>>(requestState.loading());
  readonly allProducts = computed(() => this.state().data ?? []);
  readonly products = computed(() => {
    const query = this.search().trim().toLowerCase();
    return this.allProducts().filter(
      (product) =>
        !query ||
        `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(query),
    );
  });
  readonly inventoryValue = computed(() =>
    this.allProducts().reduce((sum, product) => sum + product.price * product.stock, 0),
  );

  constructor() {
    this.productRepository
      .list()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (products) =>
          this.state.set(
            products.length ? requestState.success(products) : requestState.empty(products),
          ),
        error: (error: unknown) => this.state.set(requestState.error(error)),
      });
  }
}
