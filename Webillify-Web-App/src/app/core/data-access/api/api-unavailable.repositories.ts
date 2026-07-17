import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AuthSession, SignInCredentials } from '../../domain/auth.models';
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

const unavailable = <T>(): Observable<T> =>
  throwError(
    () =>
      new Error('API data mode is selected, but the Webillify API adapter is not implemented yet.'),
  );

@Injectable()
export class ApiDashboardRepository implements DashboardRepository {
  getSnapshot(): Observable<DashboardSnapshot> {
    return unavailable();
  }
}

@Injectable()
export class ApiProductRepository implements ProductRepository {
  list(): Observable<readonly Product[]> {
    return unavailable();
  }
}

@Injectable()
export class ApiPosRepository implements PosRepository {
  completeSale(_request: CompleteSaleRequest): Observable<CompleteSaleResult> {
    return unavailable();
  }
}

@Injectable()
export class ApiWorkspaceRepository implements WorkspaceRepository {
  getCurrentContext(): Observable<OrganizationContext> {
    return unavailable();
  }
}

@Injectable()
export class ApiAuthRepository implements AuthRepository {
  getSession(): Observable<AuthSession | null> {
    return unavailable();
  }

  signIn(_credentials: SignInCredentials): Observable<AuthSession> {
    return unavailable();
  }

  signOut(): Observable<void> {
    return unavailable();
  }
}
