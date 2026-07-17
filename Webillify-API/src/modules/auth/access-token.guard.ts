import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ApiEnvironment } from '../../config/environment';
import { PrismaService } from '../../database/prisma.service';
import type { AccessTokenPayload, AuthenticatedRequest } from './auth.types';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<ApiEnvironment, true>,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.header('authorization');
    if (!authorization?.startsWith('Bearer ')) throw unauthorized();

    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(
        authorization.slice(7),
        {
          secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
        },
      );
      if (payload.typ !== 'access' || !payload.sub || !payload.sid)
        throw unauthorized();
      const session = await this.prisma.loginSession.findUnique({
        where: { id: payload.sid },
        include: { user: true },
      });
      if (
        !session ||
        session.userId !== payload.sub ||
        session.revokedAt ||
        session.expiresAt <= new Date() ||
        session.user.status !== 'ACTIVE'
      ) {
        throw unauthorized();
      }
      request.identity = { userId: payload.sub, sessionId: payload.sid };
      return true;
    } catch {
      throw unauthorized();
    }
  }
}

function unauthorized(): UnauthorizedException {
  return new UnauthorizedException({
    code: 'ACCESS_TOKEN_INVALID',
    message: 'Authentication is required.',
  });
}
