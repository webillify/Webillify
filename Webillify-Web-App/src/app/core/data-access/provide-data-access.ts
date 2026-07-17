import { InjectionToken, makeEnvironmentProviders } from '@angular/core';
import { AppEnvironment } from '../../../environments/environment.model';
import {
  ApiAuthRepository,
  ApiDashboardRepository,
  ApiPosRepository,
  ApiProductRepository,
  ApiWorkspaceRepository,
  ApiPurchaseRepository,
  ApiSubscriptionRepository,
} from './api/api.repositories';
import {
  MockAuthRepository,
  MockDashboardRepository,
  MockPosRepository,
  MockProductRepository,
  MockWorkspaceRepository,
} from './mock/mock.repositories';
import {
  AuthRepository,
  DashboardRepository,
  PosRepository,
  ProductRepository,
  WorkspaceRepository,
  PurchaseRepository,
  SubscriptionRepository,
} from './repositories';

export const APP_ENVIRONMENT = new InjectionToken<AppEnvironment>('APP_ENVIRONMENT');

export function provideDataAccess(config: AppEnvironment) {
  const isMock = config.dataMode === 'mock';
  return makeEnvironmentProviders([
    { provide: APP_ENVIRONMENT, useValue: config },
    {
      provide: DashboardRepository,
      useClass: isMock ? MockDashboardRepository : ApiDashboardRepository,
    },
    { provide: ProductRepository, useClass: isMock ? MockProductRepository : ApiProductRepository },
    { provide: PosRepository, useClass: isMock ? MockPosRepository : ApiPosRepository },
    {
      provide: WorkspaceRepository,
      useClass: isMock ? MockWorkspaceRepository : ApiWorkspaceRepository,
    },
    { provide: AuthRepository, useClass: isMock ? MockAuthRepository : ApiAuthRepository },
    { provide: PurchaseRepository, useClass: ApiPurchaseRepository },
    { provide: SubscriptionRepository, useClass: ApiSubscriptionRepository },
  ]);
}
