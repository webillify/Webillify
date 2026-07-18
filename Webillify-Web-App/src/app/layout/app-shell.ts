import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../core/auth/auth.store';
import { CanDirective } from '../core/auth/can.directive';
import { Permission } from '../core/domain/auth.models';
import { Icon, IconName } from '../shared/icon';

interface NavItem {
  label: string;
  route: string;
  icon: IconName;
  permission: Permission;
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, CanDirective],
  templateUrl: './app-shell.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShell {
  readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  readonly mobileNavOpen = signal(false);
  private readonly allNavItems: readonly NavItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'dashboard', permission: 'dashboard.read' },
    { label: 'Point of sale', route: '/pos', icon: 'pos', permission: 'pos.create' },
    { label: 'Sales', route: '/sales', icon: 'receipt', permission: 'pos.create' },
    { label: 'Products', route: '/products', icon: 'box', permission: 'products.read' },
    { label: 'Customers', route: '/customers', icon: 'users', permission: 'customers.read' },
    { label: 'Purchases', route: '/purchases', icon: 'cart', permission: 'purchases.read' },
    { label: 'Reports', route: '/reports', icon: 'chart', permission: 'reports.read' },
  ];
  readonly navItems = computed(() =>
    this.allNavItems.filter((item) => this.auth.hasPermission(item.permission)),
  );

  async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/sign-in');
  }
}
