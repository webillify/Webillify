import { Routes } from '@angular/router';
import { authGuard, guestGuard, requirePermission } from './core/auth/auth.guards';

export const routes: Routes = [
  {
    path: 'sign-in',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/sign-in/sign-in').then((m) => m.SignInPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/app-shell').then((m) => m.AppShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        canActivate: [requirePermission('dashboard.read')],
        loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardPage),
      },
      {
        path: 'pos',
        canActivate: [requirePermission('pos.create')],
        loadComponent: () => import('./pages/pos/pos').then((m) => m.PosPage),
      },
      {
        path: 'products',
        canActivate: [requirePermission('products.read')],
        loadComponent: () => import('./pages/products/products').then((m) => m.ProductsPage),
      },
      {
        path: 'customers',
        canActivate: [requirePermission('customers.read')],
        loadComponent: () =>
          import('./pages/placeholder/placeholder').then((m) => m.PlaceholderPage),
        data: {
          title: 'Customers',
          description: 'Customer balances, receipts and payment follow-up will live here.',
        },
      },
      {
        path: 'purchases',
        canActivate: [requirePermission('purchases.read')],
        loadComponent: () => import('./pages/purchases/purchases').then((m) => m.PurchasesPage),
      },
      {
        path: 'reports',
        canActivate: [requirePermission('reports.read')],
        loadComponent: () =>
          import('./pages/placeholder/placeholder').then((m) => m.PlaceholderPage),
        data: {
          title: 'Reports',
          description: 'Sales, stock, tax, cash closing and receivable reports are planned.',
        },
      },
      {
        path: 'settings',
        canActivate: [requirePermission('settings.manage')],
        loadComponent: () =>
          import('./pages/subscriptions/subscriptions').then((m) => m.SubscriptionsPage),
      },
      {
        path: 'access-denied',
        loadComponent: () =>
          import('./pages/placeholder/placeholder').then((m) => m.PlaceholderPage),
        data: {
          title: 'Access denied',
          description: 'Your current role does not have permission to open this workspace area.',
        },
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
