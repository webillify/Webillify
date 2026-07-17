import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RequestStatus } from '../../core/data-access/request-state';
import { Icon } from '../icon';

@Component({
  selector: 'app-data-state',
  imports: [Icon],
  template: `
    @if (status() === 'loading') {
      <div class="data-state-banner" role="status" aria-live="polite">
        <span class="data-state-spinner" aria-hidden="true"></span>{{ loadingMessage() }}
      </div>
    } @else if (status() === 'error') {
      <div class="data-state-banner data-state-banner--error" role="alert">
        <app-icon name="warning" />{{ errorMessage() || 'Something went wrong. Please try again.' }}
      </div>
    } @else if (status() === 'empty') {
      <div class="shared-empty-state" role="status">
        <app-icon name="search" />
        <strong>{{ emptyTitle() }}</strong>
        <p>{{ emptyMessage() }}</p>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataState {
  readonly status = input.required<RequestStatus>();
  readonly loadingMessage = input('Loading…');
  readonly errorMessage = input<string | null | undefined>();
  readonly emptyTitle = input('Nothing here yet');
  readonly emptyMessage = input('There is no data to display.');
}
