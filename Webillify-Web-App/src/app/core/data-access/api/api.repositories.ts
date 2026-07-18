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
  OpenPosSessionRequest,
  OrganizationContext,
  PosSession,
  PosWorkspace,
  Product,
  PurchaseBill,
  PurchaseWorkspace,
  CreatePurchaseDraftRequest,
  PurchaseCompensationRequest,
  SubscriptionOverview,
  SalesCompensationRequest,
  SalesInvoice,
  SalesInvoiceDetail,
  SalesWorkspace,
} from '../../domain/models';
import {
  AuthRepository,
  DashboardRepository,
  PosRepository,
  ProductRepository,
  WorkspaceRepository,
  PurchaseRepository,
  SubscriptionRepository,
  SalesRepository,
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
  readonly defaultTaxRate: { rate: string } | null;
  readonly priceTaxMode: 'INCLUSIVE' | 'EXCLUSIVE';
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
  readonly returnedAmount: string;
  readonly outstandingAmount: string;
  readonly supplier: { name: string };
  readonly items?: Array<{ id: string; quantity: string }>;
  readonly returns?: Array<{
    items: Array<{ purchaseBillItemId: string; quantity: string }>;
  }>;
}

interface ApiPosSession {
  readonly id: string;
  readonly branchId: string;
  readonly warehouseId: string;
  readonly registerCode: string;
  readonly status: 'OPEN' | 'CLOSED';
  readonly openingCash: string;
  readonly cashSalesAmount: string;
  readonly openedAt: string;
}

interface ApiSalesInvoice {
  readonly id: string;
  readonly displayNumber: string;
  readonly invoiceDate: string;
  readonly totalAmount: string;
  readonly paidAmount: string;
  readonly returnedAmount: string;
  readonly refundedAmount: string;
  readonly outstandingAmount: string;
  readonly status: 'POSTED' | 'CANCELLED';
  readonly customer: { name: string } | null;
  readonly items?: Array<{
    readonly id: string;
    readonly description: string;
    readonly quantity: string;
    readonly lineTotal: string;
  }>;
  readonly returns?: Array<{
    readonly items: Array<{
      readonly salesInvoiceItemId: string;
      readonly quantity: string;
    }>;
  }>;
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
            taxRate: Number(product.defaultTaxRate?.rate ?? 0),
            priceTaxMode: product.priceTaxMode,
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
      invoices: this.http.get<ApiSalesInvoice[]>(`${this.environment.apiBaseUrl}/sales-invoices`),
    }).pipe(
      map(({ products, balances, bills, invoices }) => {
        const values = invoices.slice(0, 12).map((invoice) => Number(invoice.totalAmount));
        const maximum = Math.max(...values, 1);
        const productNames = new Map(
          products.flatMap((product) =>
            product.variants.map((variant) => [variant.id, product.name] as const),
          ),
        );
        return {
          recentSales: invoices.slice(0, 6).map((invoice) => ({
            invoice: invoice.displayNumber,
            customer: invoice.customer?.name ?? 'Walk-in customer',
            time: new Date(invoice.invoiceDate).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
            }),
            amount: Number(invoice.totalAmount),
            status:
              Number(invoice.outstandingAmount) === 0 ? ('Paid' as const) : ('Credit' as const),
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
            salesInvoiceCount: invoices.length,
            salesTotal: invoices.reduce((total, invoice) => total + Number(invoice.totalAmount), 0),
            outstandingReceivables: invoices.reduce(
              (total, invoice) => total + Number(invoice.outstandingAmount),
              0,
            ),
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
  private readonly http = inject(HttpClient);
  private readonly environment = inject(APP_ENVIRONMENT);
  private readonly sessionStore = inject(ApiSessionStore);

  getWorkspace(): Observable<PosWorkspace> {
    const branchId = this.sessionStore.snapshot?.session.workspace?.branchId;
    if (!branchId) return throwError(() => new Error('No active branch is selected.'));
    return forkJoin({
      sessions: this.http.get<ApiPosSession[]>(`${this.environment.apiBaseUrl}/pos-sessions`),
      balances: this.http.get<ApiStockBalance[]>(`${this.environment.apiBaseUrl}/stock-balances`),
    }).pipe(
      map(({ sessions, balances }) => {
        const branchBalances = balances.filter(({ warehouse }) => warehouse.branchId === branchId);
        const apiSession = sessions.find(
          (session) =>
            session.branchId === branchId &&
            session.registerCode === 'WEB-POS' &&
            session.status === 'OPEN',
        );
        const sessionWarehouse = apiSession
          ? branchBalances.find(({ warehouse }) => warehouse.id === apiSession.warehouseId)
              ?.warehouse
          : undefined;
        const warehouse = sessionWarehouse ?? branchBalances[0]?.warehouse;
        return {
          session: apiSession ? mapPosSession(apiSession) : null,
          warehouse: warehouse ? { id: warehouse.id, name: warehouse.name } : null,
        };
      }),
      catchError((error: unknown) => throwError(() => apiError(error))),
    );
  }

  openSession(request: OpenPosSessionRequest): Observable<PosWorkspace> {
    const branchId = this.sessionStore.snapshot?.session.workspace?.branchId;
    if (!branchId) return throwError(() => new Error('No active branch is selected.'));
    return this.http
      .post<{ session: ApiPosSession }>(
        `${this.environment.apiBaseUrl}/pos-sessions/open`,
        {
          branchId,
          warehouseId: request.warehouseId,
          registerCode: 'WEB-POS',
          openingCash: request.openingCash,
        },
        { headers: new HttpHeaders({ 'Idempotency-Key': crypto.randomUUID() }) },
      )
      .pipe(
        switchMap(() => this.getWorkspace()),
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 409) {
            return this.getWorkspace().pipe(
              switchMap((workspace) =>
                workspace.session ? of(workspace) : throwError(() => apiError(error)),
              ),
            );
          }
          return throwError(() => apiError(error));
        }),
      );
  }

  completeSale(request: CompleteSaleRequest): Observable<CompleteSaleResult> {
    if (request.paymentMethod === 'Credit') {
      return throwError(() => new Error('Select a customer before recording a credit sale.'));
    }
    const method = request.paymentMethod.toUpperCase();
    return this.http
      .post<{ invoice: ApiSalesInvoice; idempotent: boolean }>(
        `${this.environment.apiBaseUrl}/sales-invoices/post`,
        {
          posSessionId: request.posSessionId,
          taxTreatment: request.taxTreatment,
          placeOfSupplyStateCode: request.placeOfSupplyStateCode,
          expectedTotal: request.total,
          items: request.items.map((item) => ({
            variantId: item.product.id,
            quantity: item.quantity,
          })),
          payments: [{ method, amount: request.total }],
        },
        { headers: new HttpHeaders({ 'Idempotency-Key': request.idempotencyKey }) },
      )
      .pipe(
        map(({ invoice, idempotent }) => ({
          invoiceNumber: invoice.displayNumber,
          paymentMethod: request.paymentMethod,
          totalAmount: Number(invoice.totalAmount),
          idempotent,
        })),
        catchError((error: unknown) => throwError(() => apiError(error))),
      );
  }
}

@Injectable()
export class ApiSalesRepository implements SalesRepository {
  private readonly http = inject(HttpClient);
  private readonly environment = inject(APP_ENVIRONMENT);
  private readonly session = inject(ApiSessionStore);

  getWorkspace(): Observable<SalesWorkspace> {
    const branchId = this.session.snapshot?.session.workspace?.branchId;
    if (!branchId) return throwError(() => new Error('No active branch is selected.'));
    return forkJoin({
      invoices: this.http.get<ApiSalesInvoice[]>(`${this.environment.apiBaseUrl}/sales-invoices`),
      sessions: this.http.get<ApiPosSession[]>(`${this.environment.apiBaseUrl}/pos-sessions`),
    }).pipe(
      map(({ invoices, sessions }) => {
        const register = sessions.find(
          (candidate) => candidate.branchId === branchId && candidate.status === 'OPEN',
        );
        return {
          invoices: invoices.map(mapSalesInvoice),
          openPosSessionId: register?.id ?? null,
          registerCode: register?.registerCode ?? null,
        };
      }),
      catchError((error: unknown) => throwError(() => apiError(error))),
    );
  }

  getInvoice(id: string): Observable<SalesInvoiceDetail> {
    return this.http
      .get<ApiSalesInvoice>(`${this.environment.apiBaseUrl}/sales-invoices/${id}`)
      .pipe(
        map((invoice) => {
          const returned = new Map<string, number>();
          for (const salesReturn of invoice.returns ?? []) {
            for (const item of salesReturn.items) {
              returned.set(
                item.salesInvoiceItemId,
                (returned.get(item.salesInvoiceItemId) ?? 0) + Number(item.quantity),
              );
            }
          }
          return {
            ...mapSalesInvoice(invoice),
            items: (invoice.items ?? []).map((item) => {
              const returnedQuantity = returned.get(item.id) ?? 0;
              return {
                id: item.id,
                description: item.description,
                quantity: Number(item.quantity),
                returnedQuantity,
                remainingQuantity: Number(item.quantity) - returnedQuantity,
                lineTotal: Number(item.lineTotal),
              };
            }),
          };
        }),
        catchError((error: unknown) => throwError(() => apiError(error))),
      );
  }

  cancelInvoice(request: SalesCompensationRequest): Observable<SalesInvoice> {
    return this.requireRegister().pipe(
      switchMap((posSessionId) =>
        this.http.post<{ invoice: ApiSalesInvoice }>(
          `${this.environment.apiBaseUrl}/sales-invoices/${request.invoice.id}/cancel`,
          {
            reason: request.reason,
            posSessionId,
            refundMethod: request.refundMethod,
          },
          { headers: new HttpHeaders({ 'Idempotency-Key': request.idempotencyKey }) },
        ),
      ),
      map(({ invoice }) => mapSalesInvoice(invoice)),
      catchError((error: unknown) => throwError(() => apiError(error))),
    );
  }

  createReturn(request: SalesCompensationRequest): Observable<SalesInvoice> {
    const items = request.invoice.items
      .map((item) => ({
        salesInvoiceItemId: item.id,
        quantity: request.quantities[item.id] ?? 0,
      }))
      .filter(({ quantity }) => quantity > 0);
    if (!items.length)
      return throwError(() => new Error('Select at least one quantity to return.'));
    return this.requireRegister().pipe(
      switchMap((posSessionId) =>
        this.http.post<{ invoice: ApiSalesInvoice }>(
          `${this.environment.apiBaseUrl}/sales-returns`,
          {
            salesInvoiceId: request.invoice.id,
            returnDate: new Date().toISOString(),
            reason: request.reason,
            posSessionId,
            refundMethod: request.refundMethod,
            items,
          },
          { headers: new HttpHeaders({ 'Idempotency-Key': request.idempotencyKey }) },
        ),
      ),
      map(({ invoice }) => mapSalesInvoice(invoice)),
      catchError((error: unknown) => throwError(() => apiError(error))),
    );
  }

  private requireRegister(): Observable<string> {
    return this.getWorkspace().pipe(
      switchMap((workspace) =>
        workspace.openPosSessionId
          ? of(workspace.openPosSessionId)
          : throwError(() => new Error('Open a POS register before issuing a refund.')),
      ),
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

  cancelBill(request: PurchaseCompensationRequest): Observable<PurchaseBill> {
    return this.http
      .post<{ bill: ApiPurchaseBill }>(
        `${this.environment.apiBaseUrl}/purchase-bills/${request.bill.id}/cancel`,
        { reason: request.reason },
        { headers: new HttpHeaders({ 'Idempotency-Key': crypto.randomUUID() }) },
      )
      .pipe(
        map(({ bill }) => mapBill(bill)),
        catchError((error: unknown) => throwError(() => apiError(error))),
      );
  }

  returnRemaining(request: PurchaseCompensationRequest): Observable<PurchaseBill> {
    return this.http
      .get<ApiPurchaseBill>(`${this.environment.apiBaseUrl}/purchase-bills/${request.bill.id}`)
      .pipe(
        switchMap((bill) => {
          const returned = new Map<string, number>();
          for (const purchaseReturn of bill.returns ?? []) {
            for (const item of purchaseReturn.items) {
              returned.set(
                item.purchaseBillItemId,
                (returned.get(item.purchaseBillItemId) ?? 0) + Number(item.quantity),
              );
            }
          }
          const items = (bill.items ?? [])
            .map((item) => ({
              purchaseBillItemId: item.id,
              quantity: Number(item.quantity) - (returned.get(item.id) ?? 0),
            }))
            .filter(({ quantity }) => quantity > 0);
          if (items.length === 0)
            return throwError(() => new Error('This purchase has no quantity left to return.'));
          return this.http.post(
            `${this.environment.apiBaseUrl}/purchase-returns`,
            {
              purchaseBillId: bill.id,
              returnDate: new Date().toISOString().slice(0, 10),
              reason: request.reason,
              items,
            },
            { headers: new HttpHeaders({ 'Idempotency-Key': crypto.randomUUID() }) },
          );
        }),
        switchMap(() =>
          this.http.get<ApiPurchaseBill>(
            `${this.environment.apiBaseUrl}/purchase-bills/${request.bill.id}`,
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
    returnedAmount: Number(bill.returnedAmount ?? 0),
    outstandingAmount: Number(bill.outstandingAmount),
  };
}

function mapSalesInvoice(invoice: ApiSalesInvoice): SalesInvoice {
  return {
    id: invoice.id,
    invoiceNumber: invoice.displayNumber,
    invoiceDate: invoice.invoiceDate,
    status: invoice.status,
    customerName: invoice.customer?.name ?? 'Walk-in customer',
    totalAmount: Number(invoice.totalAmount),
    paidAmount: Number(invoice.paidAmount),
    returnedAmount: Number(invoice.returnedAmount ?? 0),
    refundedAmount: Number(invoice.refundedAmount ?? 0),
    outstandingAmount: Number(invoice.outstandingAmount),
  };
}

function mapPosSession(session: ApiPosSession): PosSession {
  return {
    id: session.id,
    registerCode: session.registerCode,
    status: session.status,
    openingCash: Number(session.openingCash),
    cashSalesAmount: Number(session.cashSalesAmount),
    openedAt: session.openedAt,
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
