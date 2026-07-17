import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { TenantRequest } from './authorization.types';

@Injectable()
export class TenantAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    const organizationId = request.header('x-organization-id');
    if (!organizationId) {
      throw new BadRequestException({
        code: 'ORGANIZATION_REQUIRED',
        message: 'X-Organization-Id is required for this request.',
      });
    }
    if (!isUuid(organizationId)) throw organizationNotFound();

    const membership = await this.prisma.organizationMembership.findFirst({
      where: {
        organizationId,
        userId: request.identity.userId,
        status: 'ACTIVE',
        organization: { status: { in: ['TRIALING', 'ACTIVE'] } },
      },
      include: {
        roles: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        },
        branchAccess: true,
      },
    });
    if (!membership) throw organizationNotFound();

    request.tenant = {
      organizationId,
      membershipId: membership.id,
      permissions: [
        ...new Set(
          membership.roles.flatMap(({ role }) =>
            role.permissions.map(({ permission }) => permission.code),
          ),
        ),
      ],
      branchIds: membership.branchAccess.map(({ branchId }) => branchId),
    };
    return true;
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function organizationNotFound(): NotFoundException {
  return new NotFoundException({
    code: 'ORGANIZATION_NOT_FOUND',
    message: 'The requested organization was not found.',
  });
}
