import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { SubscriptionRepository } from '../../core/data-access/repositories';
import { RequestState, requestState } from '../../core/data-access/request-state';
import { SubscriptionOverview } from '../../core/domain/models';
import { DataState } from '../../shared/feedback/data-state';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-subscriptions-page',
  imports: [DatePipe, DataState, Icon],
  templateUrl: './subscriptions.html',
  styleUrl: './subscriptions.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscriptionsPage {
  private readonly subscriptions = inject(SubscriptionRepository);
  readonly state = signal<RequestState<SubscriptionOverview>>(requestState.loading());

  constructor() {
    this.subscriptions
      .getOverview()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (overview) => this.state.set(requestState.success(overview)),
        error: (error: unknown) => this.state.set(requestState.error(error)),
      });
  }
}
