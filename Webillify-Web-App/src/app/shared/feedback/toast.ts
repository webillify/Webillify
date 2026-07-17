import { ChangeDetectionStrategy, Component, Injectable, signal } from '@angular/core';
import { Icon } from '../icon';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastMessage {
  readonly id: number;
  readonly message: string;
  readonly kind: ToastKind;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  readonly messages = signal<readonly ToastMessage[]>([]);

  show(message: string, kind: ToastKind = 'info', duration = 5000): void {
    const toast = { id: this.nextId++, message, kind };
    this.messages.update((messages) => [...messages, toast]);
    if (duration > 0) window.setTimeout(() => this.dismiss(toast.id), duration);
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error', 7000);
  }

  dismiss(id: number): void {
    this.messages.update((messages) => messages.filter((message) => message.id !== id));
  }
}

@Component({
  selector: 'app-toast-outlet',
  imports: [Icon],
  template: `
    <div class="toast-stack" aria-live="polite" aria-atomic="true">
      @for (toast of service.messages(); track toast.id) {
        <div class="app-toast" [class]="'app-toast app-toast--' + toast.kind" role="status">
          <app-icon [name]="toast.kind === 'error' ? 'warning' : 'check'" />
          <span>{{ toast.message }}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            (click)="service.dismiss(toast.id)"
          >
            <app-icon name="close" />
          </button>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastOutlet {
  constructor(readonly service: ToastService) {}
}
