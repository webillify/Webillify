import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { AuthSession, Permission, SignInCredentials } from '../../domain/auth.models';
import {
  CompleteSaleRequest,
  CompleteSaleResult,
  DashboardSnapshot,
  OrganizationContext,
  Product,
} from '../../domain/models';
import {
  AuthRepository,
  DashboardRepository,
  PosRepository,
  ProductRepository,
  WorkspaceRepository,
} from '../repositories';
import { MOCK_PRODUCTS, MOCK_RECENT_SALES } from './mock-catalog';

@Injectable()
export class MockDashboardRepository implements DashboardRepository {
  getSnapshot(): Observable<DashboardSnapshot> {
    return of({
      recentSales: MOCK_RECENT_SALES,
      salesBars: [42, 54, 46, 68, 61, 76, 84, 65, 72, 91, 78, 88],
    });
  }
}

@Injectable()
export class MockProductRepository implements ProductRepository {
  list(): Observable<readonly Product[]> {
    return of(MOCK_PRODUCTS);
  }
}

@Injectable()
export class MockPosRepository implements PosRepository {
  private nextInvoice = 249;

  completeSale(request: CompleteSaleRequest): Observable<CompleteSaleResult> {
    if (request.items.length === 0 || request.total <= 0) {
      return throwError(() => new Error('A sale requires at least one item and a positive total.'));
    }
    const invoiceNumber = `WBL-${String(this.nextInvoice++).padStart(4, '0')}`;
    return of({ invoiceNumber, paymentMethod: request.paymentMethod });
  }
}

@Injectable()
export class MockWorkspaceRepository implements WorkspaceRepository {
  getCurrentContext(): Observable<OrganizationContext> {
    return of({
      organizationId: 'org-demo',
      organizationName: 'Ageera',
      branchId: 'branch-chennai',
      branchName: 'Chennai',
    });
  }
}

const DEMO_SESSION_KEY = 'webillify.demo.session';
const OWNER_PERMISSIONS: readonly Permission[] = [
  'dashboard.read',
  'pos.create',
  'products.read',
  'products.manage',
  'customers.read',
  'customers.manage',
  'purchases.read',
  'purchases.manage',
  'reports.read',
  'settings.manage',
  'subscriptions.manage',
  'ai.use',
];

@Injectable()
export class MockAuthRepository implements AuthRepository {
  getSession(): Observable<AuthSession | null> {
    const raw = this.storage?.getItem(DEMO_SESSION_KEY);
    if (!raw) return of(null);
    try {
      const session = JSON.parse(raw) as AuthSession;
      return new Date(session.expiresAt).getTime() > Date.now()
        ? of(session)
        : this.expireSession();
    } catch {
      return this.expireSession();
    }
  }

  signIn(credentials: SignInCredentials): Observable<AuthSession> {
    if (credentials.email !== 'owner@webillify.demo' || credentials.password !== 'webillify') {
      return throwError(() => new Error('Use the prefilled Webillify demo credentials.'));
    }
    const session: AuthSession = {
      user: {
        id: 'user-demo-owner',
        displayName: 'PK Samy',
        email: credentials.email,
        role: 'Organization Owner',
        permissions: OWNER_PERMISSIONS,
      },
      expiresAt: new Date(Date.now() + (credentials.remember ? 7 : 1) * 86_400_000).toISOString(),
      mode: 'demo',
    };
    this.storage?.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
    return of(session);
  }

  signOut(): Observable<void> {
    this.storage?.removeItem(DEMO_SESSION_KEY);
    return of(undefined);
  }

  private expireSession(): Observable<null> {
    this.storage?.removeItem(DEMO_SESSION_KEY);
    return of(null);
  }

  private get storage(): Storage | null {
    return typeof localStorage === 'undefined' ? null : localStorage;
  }
}
