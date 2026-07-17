import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { AuthRepository } from '../data-access/repositories';
import { AuthSession } from '../domain/auth.models';
import { authGuard, guestGuard, requirePermission } from './auth.guards';

@Component({ template: '' })
class TestPage {}

const cashierSession: AuthSession = {
  user: {
    id: 'cashier-1',
    displayName: 'Demo Cashier',
    email: 'cashier@webillify.demo',
    role: 'Cashier',
    permissions: ['dashboard.read', 'pos.create'],
  },
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  mode: 'demo',
};

describe('authentication guards', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('redirects an unauthenticated user to sign-in with the requested URL', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'sign-in', component: TestPage },
          { path: 'dashboard', component: TestPage, canActivate: [authGuard] },
        ]),
        {
          provide: AuthRepository,
          useValue: {
            getSession: () => of(null),
            signIn: () => of(cashierSession),
            signOut: () => of(undefined),
          },
        },
      ],
    });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/dashboard');

    expect(TestBed.inject(Router).url).toBe('/sign-in?redirect=%2Fdashboard');
  });

  it('redirects authenticated guests away from sign-in', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'sign-in', component: TestPage, canActivate: [guestGuard] },
          { path: 'dashboard', component: TestPage },
        ]),
        {
          provide: AuthRepository,
          useValue: {
            getSession: () => of(cashierSession),
            signIn: () => of(cashierSession),
            signOut: () => of(undefined),
          },
        },
      ],
    });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/sign-in');

    expect(TestBed.inject(Router).url).toBe('/dashboard');
  });

  it('denies a route when the current role lacks its permission', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'products',
            component: TestPage,
            canActivate: [requirePermission('products.read')],
          },
          { path: 'access-denied', component: TestPage },
        ]),
        {
          provide: AuthRepository,
          useValue: {
            getSession: () => of(cashierSession),
            signIn: () => of(cashierSession),
            signOut: () => of(undefined),
          },
        },
      ],
    });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/products');

    expect(TestBed.inject(Router).url).toBe('/access-denied');
  });
});
