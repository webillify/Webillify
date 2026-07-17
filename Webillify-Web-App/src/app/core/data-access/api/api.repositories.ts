import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  Observable,
  catchError,
  defer,
  finalize,
  forkJoin,
  map,
  of,
  switchMap,
  throwError,
} from 'rxjs';
import { AuthSession, Permission, SignInCredentials, UserRole } from '../../domain/auth.models';
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
import { APP_ENVIRONMENT } from '../provide-data-access';
import { ApiSessionStore, StoredApiSession } from './api-session';

interface TokenResponse {
  readonly accessToken: string;
  readonly expiresIn: number;
}

interface MeResponse {
  readonly user: { id: string; email: string; displayName: string };
  readonly memberships: Array<{
    organization: { id: string; name: string };
    roles: Array<{ name: string }>;
    permissions: string[];
    branches: Array<{ id: string; name: string }>;
  }>;
}

interface ApiProduct {
  readonly id: string;
  readonly name: string;
  readonly category: { name: string } | null;
  readonly baseUnit: { symbol: string };
  readonly variants: Array<{ id: string; sku: string; name: string | null; salePrice: string }>;
}

interface ApiStockBalance {
  readonly quantity: string;
  readonly variant: { id: string };
}

const KNOWN_PERMISSIONS: readonly Permission[] = [
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
export class ApiAuthRepository implements AuthRepository {
  private readonly http = inject(HttpClient);
  private readonly environment = inject(APP_ENVIRONMENT);
  private readonly store = inject(ApiSessionStore);

  getSession(): Observable<AuthSession | null> {
    return defer(() => {
      const stored = this.store.snapshot;
      if (!stored) return of(null);
      const token =
        new Date(stored.accessExpiresAt).getTime() > Date.now() + 5_000
          ? of<TokenResponse>({
              accessToken: stored.accessToken,
              expiresIn: Math.max(
                1,
                Math.floor((new Date(stored.accessExpiresAt).getTime() - Date.now()) / 1_000),
              ),
            })
          : this.refresh();
      return token.pipe(
        switchMap((response) => this.hydrate(response, stored.remember)),
        catchError(() => {
          this.store.clear();
          return of(null);
        }),
      );
    });
  }

  signIn(credentials: SignInCredentials): Observable<AuthSession> {
    return this.http
      .post<TokenResponse>(`${this.environment.apiBaseUrl}/auth/login`, credentials, {
        withCredentials: true,
      })
      .pipe(
        switchMap((response) => this.hydrate(response, credentials.remember)),
        catchError((error: unknown) => throwError(() => apiError(error))),
      );
  }

  signOut(): Observable<void> {
    return this.http
      .post<void>(`${this.environment.apiBaseUrl}/auth/logout`, {}, { withCredentials: true })
      .pipe(
        catchError(() => of(undefined)),
        finalize(() => this.store.clear()),
      );
  }

  private refresh(): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(
      `${this.environment.apiBaseUrl}/auth/refresh`,
      {},
      { withCredentials: true },
    );
  }

  private hydrate(token: TokenResponse, remember: boolean): Observable<AuthSession> {
    return this.http
      .get<MeResponse>(`${this.environment.apiBaseUrl}/me`, {
        headers: new HttpHeaders({ Authorization: `Bearer ${token.accessToken}` }),
      })
      .pipe(
        map((response) => {
          const membership = response.memberships[0];
          const branch = membership?.branches[0];
          if (!membership || !branch)
            throw new Error('This account has no active workspace branch.');
          const permissions = membership.permissions.filter((value): value is Permission =>
            KNOWN_PERMISSIONS.includes(value as Permission),
          );
          const session: AuthSession = {
            user: {
              id: response.user.id,
              email: response.user.email,
              displayName: response.user.displayName,
              role: (membership.roles[0]?.name ?? 'Organization Owner') as UserRole,
              permissions,
            },
            expiresAt: new Date(Date.now() + token.expiresIn * 1_000).toISOString(),
            mode: 'api',
            workspace: {
              organizationId: membership.organization.id,
              organizationName: membership.organization.name,
              branchId: branch.id,
              branchName: branch.name,
            },
          };
          const stored: StoredApiSession = {
            accessToken: token.accessToken,
            accessExpiresAt: session.expiresAt,
            remember,
            session,
          };
          this.store.save(stored);
          return session;
        }),
      );
  }
}

@Injectable()
export class ApiProductRepository implements ProductRepository {
  private readonly http = inject(HttpClient);
  private readonly environment = inject(APP_ENVIRONMENT);

  list(): Observable<readonly Product[]> {
    return forkJoin({
      products: this.http.get<ApiProduct[]>(`${this.environment.apiBaseUrl}/products`),
      balances: this.http.get<ApiStockBalance[]>(`${this.environment.apiBaseUrl}/stock-balances`),
    }).pipe(
      map(({ products, balances }) => {
        const stock = new Map(
          balances.map((balance) => [balance.variant.id, Number(balance.quantity)]),
        );
        return products.flatMap((product) =>
          product.variants.map((variant, index) => ({
            id: variant.id,
            name: variant.name ? `${product.name} · ${variant.name}` : product.name,
            sku: variant.sku,
            category: product.category?.name ?? 'Uncategorised',
            price: Number(variant.salePrice),
            stock: stock.get(variant.id) ?? 0,
            unit: product.baseUnit.symbol,
            color: palette((product.id.charCodeAt(0) + index) % 6),
            initials: initials(product.name),
          })),
        );
      }),
      catchError((error: unknown) => throwError(() => apiError(error))),
    );
  }
}

@Injectable()
export class ApiWorkspaceRepository implements WorkspaceRepository {
  private readonly store = inject(ApiSessionStore);

  getCurrentContext(): Observable<OrganizationContext> {
    const workspace = this.store.snapshot?.session.workspace;
    return workspace
      ? of(workspace)
      : throwError(() => new Error('No active organization and branch are selected.'));
  }
}

@Injectable()
export class ApiDashboardRepository implements DashboardRepository {
  getSnapshot(): Observable<DashboardSnapshot> {
    return of({ recentSales: [], salesBars: Array.from({ length: 12 }, () => 0) });
  }
}

@Injectable()
export class ApiPosRepository implements PosRepository {
  completeSale(_request: CompleteSaleRequest): Observable<CompleteSaleResult> {
    return throwError(
      () => new Error('Sales posting is not implemented in the current backend stage yet.'),
    );
  }
}

function apiError(error: unknown): Error {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { error?: { message?: string } } | null;
    return new Error(body?.error?.message ?? `API request failed with status ${error.status}.`);
  }
  return error instanceof Error ? error : new Error('The API request could not be completed.');
}

function initials(value: string): string {
  return value
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function palette(index: number): string {
  return ['#cfe8df', '#d9e5f2', '#efe0bd', '#e8d5eb', '#d7e7bd', '#f0d2c8'][index] ?? '#cfe8df';
}
