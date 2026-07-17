import type { Request } from 'express';

export interface AccessTokenPayload {
  readonly sub: string;
  readonly sid: string;
  readonly typ: 'access';
}

export interface RequestIdentity {
  readonly userId: string;
  readonly sessionId: string;
}

export interface AuthenticatedRequest extends Request {
  identity: RequestIdentity;
}

export interface CookieRequest extends Request {
  cookies: Record<string, string | undefined>;
}

export interface AuthTokenResponse {
  readonly accessToken: string;
  readonly tokenType: 'Bearer';
  readonly expiresIn: number;
  readonly sessionId: string;
}
