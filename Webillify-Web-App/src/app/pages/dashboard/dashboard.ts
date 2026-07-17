import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { DashboardRepository } from '../../core/data-access/repositories';
import { RequestState, requestState } from '../../core/data-access/request-state';
import { DashboardSnapshot } from '../../core/domain/models';
import { DataState } from '../../shared/feedback/data-state';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink, Icon, DataState],
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly dashboardRepository = inject(DashboardRepository);

  readonly period = signal('Today');
  readonly state = signal<RequestState<DashboardSnapshot>>(requestState.loading());
  readonly recentSales = computed(() => this.state().data?.recentSales ?? []);
  readonly bars = computed(() => this.state().data?.salesBars ?? []);

  constructor() {
    this.dashboardRepository
      .getSnapshot()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (snapshot) =>
          this.state.set(
            snapshot.recentSales.length
              ? requestState.success(snapshot)
              : requestState.empty(snapshot),
          ),
        error: (error: unknown) => this.state.set(requestState.error(error)),
      });
  }
}
