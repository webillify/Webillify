import { Observable } from 'rxjs';
import { AuthSession, SignInCredentials } from '../domain/auth.models';
import {
  CompleteSaleRequest,
  CompleteSaleResult,
  OpenPosSessionRequest,
  PosWorkspace,
  DashboardSnapshot,
  OrganizationContext,
  Product,
  PurchaseBill,
  PurchaseWorkspace,
  CreatePurchaseDraftRequest,
  PurchaseCompensationRequest,
  SubscriptionOverview,
} from '../domain/models';

export abstract class DashboardRepository {
  abstract getSnapshot(): Observable<DashboardSnapshot>;
}

export abstract class ProductRepository {
  abstract list(): Observable<readonly Product[]>;
}

export abstract class PosRepository {
  abstract getWorkspace(): Observable<PosWorkspace>;
  abstract openSession(request: OpenPosSessionRequest): Observable<PosWorkspace>;
  abstract completeSale(request: CompleteSaleRequest): Observable<CompleteSaleResult>;
}

export abstract class WorkspaceRepository {
  abstract getCurrentContext(): Observable<OrganizationContext>;
}

export abstract class AuthRepository {
  abstract getSession(): Observable<AuthSession | null>;
  abstract signIn(credentials: SignInCredentials): Observable<AuthSession>;
  abstract signOut(): Observable<void>;
}

export abstract class PurchaseRepository {
  abstract getWorkspace(): Observable<PurchaseWorkspace>;
  abstract createDraft(request: CreatePurchaseDraftRequest): Observable<PurchaseBill>;
  abstract postBill(id: string): Observable<PurchaseBill>;
  abstract payOutstanding(bill: PurchaseBill): Observable<PurchaseBill>;
  abstract cancelBill(request: PurchaseCompensationRequest): Observable<PurchaseBill>;
  abstract returnRemaining(request: PurchaseCompensationRequest): Observable<PurchaseBill>;
}

export abstract class SubscriptionRepository {
  abstract getOverview(): Observable<SubscriptionOverview>;
}
