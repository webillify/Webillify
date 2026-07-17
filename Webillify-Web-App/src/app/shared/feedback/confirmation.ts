import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Injectable,
  effect,
  signal,
  viewChild,
} from '@angular/core';
import { Icon } from '../icon';

export interface ConfirmationOptions {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  readonly destructive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConfirmationService {
  readonly pending = signal<ConfirmationOptions | null>(null);
  private resolver?: (confirmed: boolean) => void;
  private returnFocusTo?: HTMLElement;

  confirm(options: ConfirmationOptions): Promise<boolean> {
    this.resolve(false);
    this.returnFocusTo = document.activeElement as HTMLElement | undefined;
    this.pending.set(options);
    return new Promise<boolean>((resolve) => (this.resolver = resolve));
  }

  accept(): void {
    this.resolve(true);
  }

  cancel(): void {
    this.resolve(false);
  }

  private resolve(confirmed: boolean): void {
    this.resolver?.(confirmed);
    this.resolver = undefined;
    this.pending.set(null);
    this.returnFocusTo?.focus();
    this.returnFocusTo = undefined;
  }
}

@Component({
  selector: 'app-confirmation-outlet',
  imports: [Icon],
  template: `
    @if (service.pending(); as confirmation) {
      <div class="modal-backdrop" (click)="service.cancel()">
        <section
          #dialog
          class="confirmation-modal"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirmation-title"
          aria-describedby="confirmation-message"
          tabindex="-1"
          (click)="$event.stopPropagation()"
        >
          <button
            class="icon-button confirmation-modal__close"
            type="button"
            aria-label="Close"
            (click)="service.cancel()"
          >
            <app-icon name="close" />
          </button>
          <span class="confirmation-modal__icon"><app-icon name="warning" /></span>
          <h2 id="confirmation-title">{{ confirmation.title }}</h2>
          <p id="confirmation-message">{{ confirmation.message }}</p>
          <div class="confirmation-modal__actions">
            <button class="button button--secondary" type="button" (click)="service.cancel()">
              {{ confirmation.cancelLabel || 'Cancel' }}
            </button>
            <button
              class="button button--primary"
              [class.button--danger]="confirmation.destructive"
              type="button"
              (click)="service.accept()"
            >
              {{ confirmation.confirmLabel || 'Confirm' }}
            </button>
          </div>
        </section>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmationOutlet {
  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');

  @HostListener('document:keydown.escape')
  cancelOnEscape(): void {
    if (this.service.pending()) this.service.cancel();
  }

  constructor(readonly service: ConfirmationService) {
    effect(() => {
      if (service.pending()) window.setTimeout(() => this.dialog()?.nativeElement.focus());
    });
  }
}
