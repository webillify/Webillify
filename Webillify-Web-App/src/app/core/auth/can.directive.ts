import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { Permission } from '../domain/auth.models';
import { AuthStore } from './auth.store';

@Directive({ selector: '[appCan]' })
export class CanDirective {
  private readonly auth = inject(AuthStore);
  private readonly template = inject(TemplateRef<unknown>);
  private readonly container = inject(ViewContainerRef);
  private rendered = false;

  readonly appCan = input<Permission | null>(null);

  constructor() {
    effect(() => {
      const permission = this.appCan();
      const allowed = permission !== null && this.auth.hasPermission(permission);
      if (allowed && !this.rendered) {
        this.container.createEmbeddedView(this.template);
        this.rendered = true;
      } else if (!allowed && this.rendered) {
        this.container.clear();
        this.rendered = false;
      }
    });
  }
}
