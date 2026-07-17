import { Observable } from 'rxjs';
import { AuthSession, SignInCredentials } from '../domain/auth.models';
import {
  CompleteSaleRequest,
  CompleteSaleResult,
  DashboardSnapshot,
  OrganizationContext,
  Product,
} from '../domain/models';

export abstract class DashboardRepository {
  abstract getSnapshot(): Observable<DashboardSnapshot>;
}

export abstract class ProductRepository {
  abstract list(): Observable<readonly Product[]>;
}

export abstract class PosRepository {
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
