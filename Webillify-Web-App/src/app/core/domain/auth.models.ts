export type UserRole =
  | 'Platform Super Admin'
  | 'Support Agent'
  | 'Organization Owner'
  | 'Branch Admin'
  | 'Store Manager'
  | 'Cashier'
  | 'Accountant'
  | 'Inventory Staff'
  | 'Auditor';

export type Permission =
  | 'dashboard.read'
  | 'pos.create'
  | 'products.read'
  | 'products.manage'
  | 'customers.read'
  | 'customers.manage'
  | 'purchases.read'
  | 'purchases.manage'
  | 'reports.read'
  | 'settings.manage'
  | 'subscriptions.manage'
  | 'ai.use';

export interface AuthUser {
  readonly id: string;
  readonly displayName: string;
  readonly email: string;
  readonly role: UserRole;
  readonly permissions: readonly Permission[];
}

export interface AuthSession {
  readonly user: AuthUser;
  readonly expiresAt: string;
  readonly mode: 'demo' | 'api';
  readonly workspace?: {
    readonly organizationId: string;
    readonly organizationName: string;
    readonly branchId: string;
    readonly branchName: string;
  };
}

export interface SignInCredentials {
  readonly email: string;
  readonly password: string;
  readonly remember: boolean;
}
