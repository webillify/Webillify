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
  PurchaseBill,
  PurchaseWorkspace,
  CreatePurchaseDraftRequest,
  SubscriptionOverview,
} from '../../domain/models';
import {
  AuthRepository,
  DashboardRepository,
  PosRepository,
  ProductRepository,
  WorkspaceRepository,
  PurchaseRepository,
  SubscriptionRepository,
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
  readonly warehouse: { id: string; name: string; branchId: string };
}

interface ApiSupplier {
  readonly id: string;
  readonly normalizedCode: string;
  readonly name: string;
  readonly gstin: string | null;
  readonly creditDays: number;
}

interface ApiPurchaseBill {
  readonly id: string;
  readonly supplierId: string;
  readonly supplierInvoiceReference: string;
  readonly invoiceDate: string;
  readonly status: 'DRAFT' | 'POSTED' | 'CANCELLED';
  readonly totalAmount: string;
  readonly paidAmount: string;
  readonly outstandingAmount: string;
  readonly supplier: { name: string };
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
  private readonly http = inject(HttpClient);
  private readonly environment = inject(APP_ENVIRONMENT);

  getSnapshot(): Observable<DashboardSnapshot> {
    return forkJoin({
      products: this.http.get<ApiProduct[]>(`${this.environment.apiBaseUrl}/products`),
      balances: this.http.get<ApiStockBalance[]>(`${this.environment.apiBaseUrl}/stock-balances`),
      bills: this.http.get<ApiPurchaseBill[]>(`${this.environment.apiBaseUrl}/purchase-bills`),
    }).pipe(
      map(({ products, balances, bills }) => {
        const values = bills.slice(0, 12).map((bill) => Number(bill.totalAmount));
        const maximum = Math.max(...values, 1);
        const productNames = new Map(
          products.flatMap((product) =>
            product.variants.map((variant) => [variant.id, product.name] as const),
          ),
        );
        return {
          recentSales: bills.slice(0, 6).map((bill) => ({
            invoice: bill.supplierInvoiceReference,
            customer: bill.supplier.name,
            time: new Date(bill.invoiceDate).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
            }),
            amount: Number(bill.totalAmount),
            status: Number(bill.outstandingAmount) === 0 ? ('Paid' as const) : ('Credit' as const),
          })),
          salesBars: values.length
            ? values.map((value) => Math.max(8, Math.round((value / maximum) * 100)))
            : Array.from({ length: 12 }, () => 0),
          metrics: {
            productCount: products.reduce((total, product) => total + product.variants.length, 0),
            stockUnits: balances.reduce((total, balance) => total + Number(balance.quantity), 0),
            purchaseBillCount: bills.length,
            outstandingPayables: bills.reduce(
              (total, bill) => total + Number(bill.outstandingAmount),
              0,
            ),
            purchaseTotal: bills.reduce((total, bill) => total + Number(bill.totalAmount), 0),
          },
          stockAlerts: balances
            .filter((balance) => Number(balance.quantity) < 8)
            .slice(0, 4)
            .map((balance) => ({
              name: productNames.get(balance.variant.id) ?? 'Product variant',
              stock: Number(balance.quantity),
            })),
        };
      }),
      catchError((error: unknown) => throwError(() => apiError(error))),
    );
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

@Injectable()
export class ApiPurchaseRepository implements PurchaseRepository {
  private readonly http = inject(HttpClient);
  private readonly environment = inject(APP_ENVIRONMENT);
  private readonly session = inject(ApiSessionStore);

  getWorkspace(): Observable<PurchaseWorkspace> {
    return forkJoin({
      suppliers: this.http.get<ApiSupplier[]>(`${this.environment.apiBaseUrl}/suppliers`),
      bills: this.http.get<ApiPurchaseBill[]>(`${this.environment.apiBaseUrl}/purchase-bills`),
      products: this.http.get<ApiProduct[]>(`${this.environment.apiBaseUrl}/products`),
      balances: this.http.get<ApiStockBalance[]>(`${this.environment.apiBaseUrl}/stock-balances`),
    }).pipe(
      map(({ suppliers, bills, products, balances }) => ({
        suppliers: suppliers.map((supplier) => ({
          id: supplier.id,
          code: supplier.normalizedCode,
          name: supplier.name,
          gstin: supplier.gstin,
          creditDays: supplier.creditDays,
        })),
        bills: bills.map(mapBill),
        variants: products.flatMap((product) =>
          product.variants.map((variant) => ({
            id: variant.id,
            sku: variant.sku,
            label: variant.name ? `${product.name} · ${variant.name}` : product.name,
          })),
        ),
        warehouse: balances[0]?.warehouse
          ? { id: balances[0].warehouse.id, name: balances[0].warehouse.name }
          : null,
      })),
      catchError((error: unknown) => throwError(() => apiError(error))),
    );
  }

  createDraft(request: CreatePurchaseDraftRequest): Observable<PurchaseBill> {
    const workspace = this.session.snapshot?.session.workspace;
    if (!workspace) return throwError(() => new Error('No active branch is selected.'));
    return this.http
      .post<ApiPurchaseBill>(`${this.environment.apiBaseUrl}/purchase-bills`, {
        branchId: workspace.branchId,
        warehouseId: request.warehouseId,
        supplierId: request.supplierId,
        supplierInvoiceReference: request.reference,
        invoiceDate: request.invoiceDate,
        taxTreatment: 'INTRASTATE',
        inputTaxEligible: true,
        roundOff: 0,
        items: [
          {
            variantId: request.variantId,
            quantity: request.quantity,
            unitCost: request.unitCost,
            taxRate: request.taxRate,
            inputTaxEligible: true,
          },
        ],
      })
      .pipe(
        map(mapBill),
        catchError((error: unknown) => throwError(() => apiError(error))),
      );
  }

  postBill(id: string): Observable<PurchaseBill> {
    return this.http
      .post<{ bill: ApiPurchaseBill }>(
        `${this.environment.apiBaseUrl}/purchase-bills/${id}/post`,
        {},
        { headers: new HttpHeaders({ 'Idempotency-Key': crypto.randomUUID() }) },
      )
      .pipe(
        map(({ bill }) => mapBill(bill)),
        catchError((error: unknown) => throwError(() => apiError(error))),
      );
  }

  payOutstanding(bill: PurchaseBill): Observable<PurchaseBill> {
    const workspace = this.session.snapshot?.session.workspace;
    if (!workspace) return throwError(() => new Error('No active branch is selected.'));
    return this.http
      .post(
        `${this.environment.apiBaseUrl}/supplier-payments`,
        {
          branchId: workspace.branchId,
          supplierId: bill.supplierId,
          method: 'BANK',
          amount: bill.outstandingAmount,
          reference: `WEB-${bill.reference}`.slice(0, 120),
          paidAt: new Date().toISOString(),
          allocations: [{ purchaseBillId: bill.id, amount: bill.outstandingAmount }],
        },
        { headers: new HttpHeaders({ 'Idempotency-Key': crypto.randomUUID() }) },
      )
      .pipe(
        switchMap(() =>
          this.http.get<ApiPurchaseBill>(
            `${this.environment.apiBaseUrl}/purchase-bills/${bill.id}`,
          ),
        ),
        map(mapBill),
        catchError((error: unknown) => throwError(() => apiError(error))),
      );
  }
}

@Injectable()
export class ApiSubscriptionRepository implements SubscriptionRepository {
  private readonly http = inject(HttpClient);
  private readonly environment = inject(APP_ENVIRONMENT);

  getOverview(): Observable<SubscriptionOverview> {
    return forkJoin({
      core: this.http.get<any>(`${this.environment.apiBaseUrl}/subscription`),
      usage: this.http.get<any>(`${this.environment.apiBaseUrl}/usage`),
      aiPlan: this.http.get<any>(`${this.environment.apiBaseUrl}/ai/plan`),
      aiUsage: this.http.get<any>(`${this.environment.apiBaseUrl}/ai/usage`),
    }).pipe(
      map(({ core, usage, aiPlan, aiUsage }) => ({
        core: {
          planName: core.subscription.plan.name,
          planCode: core.subscription.plan.code,
          status: core.subscription.status,
          billingInterval: core.subscription.billingInterval,
          periodEnd: core.subscription.currentPeriodEnd,
          mutationAllowed: core.mutationAllowed,
          branchesUsed: usage.usage.branches,
          branchLimit: numberEntitlement(core.subscription.entitlements['branches.max']),
          usersUsed: usage.usage.users,
          userLimit: numberEntitlement(core.subscription.entitlements['users.max']),
        },
        ai: {
          planName: aiPlan.name,
          status: aiUsage.subscription?.status ?? 'NOT_SUBSCRIBED',
          usable: aiUsage.usable,
          monthlyPrice: Number(aiPlan.monthlyPrice),
          availableCredits: aiUsage.availableCredits,
          monthlyCredits: aiUsage.subscription?.monthlyCredits ?? 0,
          separateFromCore: aiPlan.separateFromCore,
        },
      })),
      catchError((error: unknown) => throwError(() => apiError(error))),
    );
  }
}

function mapBill(bill: ApiPurchaseBill): PurchaseBill {
  return {
    id: bill.id,
    supplierId: bill.supplierId,
    supplierName: bill.supplier.name,
    reference: bill.supplierInvoiceReference,
    invoiceDate: bill.invoiceDate,
    status: bill.status,
    totalAmount: Number(bill.totalAmount),
    paidAmount: Number(bill.paidAmount),
    outstandingAmount: Number(bill.outstandingAmount),
  };
}

function numberEntitlement(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
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
