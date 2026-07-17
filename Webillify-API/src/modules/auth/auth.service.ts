import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import argon2 from 'argon2';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { ApiEnvironment } from '../../config/environment';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import type {
  AccessTokenPayload,
  AuthTokenResponse,
  RequestIdentity,
} from './auth.types';

export const REFRESH_COOKIE = 'webillify_refresh';

interface LoginContext {
  readonly ipAddress?: string;
  readonly userAgent?: string;
}

interface RefreshResult {
  readonly response: AuthTokenResponse;
  readonly refreshToken: string;
  readonly refreshExpiresAt: Date;
}

export interface MeResponse {
  readonly user: { id: string; email: string; displayName: string };
  readonly sessionId: string;
  readonly memberships: Array<{
    organization: { id: string; name: string; status: string };
    roles: Array<{ id: string; code: string; name: string }>;
    permissions: string[];
    branches: Array<{ id: string; name: string; code: string }>;
  }>;
}

class RefreshReuseError extends Error {}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<ApiEnvironment, true>,
  ) {}

  async login(dto: LoginDto, context: LoginContext): Promise<RefreshResult> {
    const user = await this.prisma.user.findUnique({
      where: { normalizedEmail: dto.email },
    });
    const passwordMatches = user?.passwordHash
      ? await argon2.verify(user.passwordHash, dto.password).catch(() => false)
      : false;
    if (!user || user.status !== 'ACTIVE' || !passwordMatches)
      throw invalidCredentials();

    const now = new Date();
    const refreshExpiresAt = new Date(
      now.getTime() + (dto.remember ? 30 : 1) * 86_400_000,
    );
    const refreshToken = createRefreshToken();
    const sessionId = randomUUID();
    await this.prisma.$transaction([
      this.prisma.loginSession.create({
        data: {
          id: sessionId,
          userId: user.id,
          tokenFamilyId: randomUUID(),
          ipAddress: context.ipAddress,
          userAgent: context.userAgent?.slice(0, 500),
          expiresAt: refreshExpiresAt,
        },
      }),
      this.prisma.refreshToken.create({
        data: {
          sessionId,
          tokenHash: this.hashRefreshToken(refreshToken),
          expiresAt: refreshExpiresAt,
        },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: now },
      }),
    ]);

    return {
      response: await this.createAccessToken(user.id, sessionId),
      refreshToken,
      refreshExpiresAt,
    };
  }

  async refresh(rawToken: string | undefined): Promise<RefreshResult> {
    if (!rawToken) throw invalidRefreshToken();
    const tokenHash = this.hashRefreshToken(rawToken);
    const current = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { session: { include: { user: true } } },
    });
    if (!current) throw invalidRefreshToken();
    if (current.consumedAt || current.revokedAt) {
      await this.revokeSession(current.sessionId, 'refresh_token_reuse');
      throw reuseDetected();
    }
    const now = new Date();
    if (
      current.expiresAt <= now ||
      current.session.expiresAt <= now ||
      current.session.revokedAt ||
      current.session.user.status !== 'ACTIVE'
    ) {
      throw invalidRefreshToken();
    }

    const replacementToken = createRefreshToken();
    const replacementId = randomUUID();
    try {
      await this.prisma.$transaction(async (transaction) => {
        const consumed = await transaction.refreshToken.updateMany({
          where: { id: current.id, consumedAt: null, revokedAt: null },
          data: { consumedAt: now, replacedBy: replacementId },
        });
        if (consumed.count !== 1) throw new RefreshReuseError();
        await transaction.refreshToken.create({
          data: {
            id: replacementId,
            sessionId: current.sessionId,
            tokenHash: this.hashRefreshToken(replacementToken),
            expiresAt: current.session.expiresAt,
          },
        });
        await transaction.loginSession.update({
          where: { id: current.sessionId },
          data: { lastSeenAt: now },
        });
      });
    } catch (error) {
      if (error instanceof RefreshReuseError) {
        await this.revokeSession(current.sessionId, 'refresh_token_reuse');
        throw reuseDetected();
      }
      throw error;
    }

    return {
      response: await this.createAccessToken(
        current.session.userId,
        current.sessionId,
      ),
      refreshToken: replacementToken,
      refreshExpiresAt: current.session.expiresAt,
    };
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashRefreshToken(rawToken) },
    });
    if (token) await this.revokeSession(token.sessionId, 'user_logout');
  }

  async getMe(
    identity: RequestIdentity,
    organizationId?: string,
  ): Promise<MeResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: identity.userId },
      include: {
        memberships: {
          where: {
            status: 'ACTIVE',
            ...(organizationId ? { organizationId } : {}),
          },
          include: {
            organization: true,
            roles: {
              include: {
                role: {
                  include: { permissions: { include: { permission: true } } },
                },
              },
            },
            branchAccess: { include: { branch: true } },
          },
        },
      },
    });
    const memberships = user.memberships.map((membership) => ({
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        status: membership.organization.status,
      },
      roles: membership.roles.map(({ role }) => ({
        id: role.id,
        code: role.code,
        name: role.name,
      })),
      permissions: [
        ...new Set(
          membership.roles.flatMap(({ role }) =>
            role.permissions.map(({ permission }) => permission.code),
          ),
        ),
      ],
      branches: membership.branchAccess.map(({ branch }) => ({
        id: branch.id,
        name: branch.name,
        code: branch.normalizedCode,
      })),
    }));
    if (organizationId && memberships.length === 0) throw invalidOrganization();
    return {
      user: { id: user.id, email: user.email, displayName: user.displayName },
      sessionId: identity.sessionId,
      memberships,
    };
  }

  private async createAccessToken(
    userId: string,
    sessionId: string,
  ): Promise<AuthTokenResponse> {
    const expiresIn = this.config.get('ACCESS_TOKEN_TTL_SECONDS', {
      infer: true,
    });
    const payload: AccessTokenPayload = {
      sub: userId,
      sid: sessionId,
      typ: 'access',
    };
    return {
      accessToken: await this.jwt.signAsync(payload, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
        expiresIn,
      }),
      tokenType: 'Bearer',
      expiresIn,
      sessionId,
    };
  }

  private hashRefreshToken(token: string): string {
    return createHmac(
      'sha256',
      this.config.get('REFRESH_TOKEN_PEPPER', { infer: true }),
    )
      .update(token)
      .digest('hex');
  }

  private async revokeSession(
    sessionId: string,
    reason: string,
  ): Promise<void> {
    const revokedAt = new Date();
    await this.prisma.$transaction([
      this.prisma.loginSession.updateMany({
        where: { id: sessionId, revokedAt: null },
        data: { revokedAt, revokeReason: reason },
      }),
      this.prisma.refreshToken.updateMany({
        where: { sessionId, revokedAt: null },
        data: { revokedAt },
      }),
    ]);
  }
}

function createRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

function invalidCredentials(): UnauthorizedException {
  return new UnauthorizedException({
    code: 'INVALID_CREDENTIALS',
    message: 'Email or password is incorrect.',
  });
}

function invalidRefreshToken(): UnauthorizedException {
  return new UnauthorizedException({
    code: 'REFRESH_TOKEN_INVALID',
    message: 'The session is no longer valid.',
  });
}

function reuseDetected(): UnauthorizedException {
  return new UnauthorizedException({
    code: 'REFRESH_REUSE_DETECTED',
    message: 'The session was revoked because a refresh token was reused.',
  });
}

function invalidOrganization(): UnauthorizedException {
  return new UnauthorizedException({
    code: 'ORGANIZATION_ACCESS_DENIED',
    message: 'The selected organization is not available to this account.',
  });
}
