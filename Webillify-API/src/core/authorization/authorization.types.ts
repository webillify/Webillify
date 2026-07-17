import type { Request } from 'express';
import type { AuthenticatedRequest } from '../../modules/auth/auth.types';

export interface TenantContext {
  readonly organizationId: string;
  readonly membershipId: string;
  readonly permissions: readonly string[];
  readonly branchIds: readonly string[];
}

export interface TenantRequest extends AuthenticatedRequest, Request {
  tenant: TenantContext;
}
