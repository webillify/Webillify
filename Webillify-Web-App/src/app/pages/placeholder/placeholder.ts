import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-placeholder-page',
  imports: [RouterLink, Icon],
  template: `
    <section class="placeholder-page">
      <span class="placeholder-page__icon"><app-icon name="sparkles" /></span>
      <span class="eyebrow">Next build slice</span>
      <h1>{{ title }}</h1>
      <p>{{ description }}</p>
      <a class="button button--primary" routerLink="/dashboard"
        ><app-icon name="arrow" /> Back to dashboard</a
      >
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceholderPage {
  readonly title: string;
  readonly description: string;
  constructor(route: ActivatedRoute) {
    this.title = route.snapshot.data['title'] as string;
    this.description = route.snapshot.data['description'] as string;
  }
}
