import { TestBed } from '@angular/core/testing';
import { ConfirmationService } from './confirmation';
import { ToastService } from './toast';

describe('shared feedback services', () => {
  it('publishes and dismisses toast messages', () => {
    const service = TestBed.inject(ToastService);
    service.show('Saved', 'success', 0);

    expect(service.messages()).toHaveLength(1);
    service.dismiss(service.messages()[0].id);
    expect(service.messages()).toEqual([]);
  });

  it('resolves confirmation decisions', async () => {
    const service = TestBed.inject(ConfirmationService);
    const decision = service.confirm({ title: 'Delete?', message: 'This is permanent.' });
    service.accept();

    await expect(decision).resolves.toBe(true);
    expect(service.pending()).toBeNull();
  });
});
