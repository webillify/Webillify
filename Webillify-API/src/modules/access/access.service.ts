import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { TenantContext } from '../../core/authorization/authorization.types';

@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  listOrganizations(userId: string): Promise<object[]> {
    return this.prisma.organizationMembership.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        organization: { status: { in: ['TRIALING', 'ACTIVE'] } },
      },
      select: {
        organization: {
          select: { id: true, name: true, slug: true, status: true },
        },
      },
      orderBy: { organization: { name: 'asc' } },
    });
  }

  listBranches(tenant: TenantContext): Promise<object[]> {
    return this.prisma.branch.findMany({
      where: {
        organizationId: tenant.organizationId,
        id: { in: [...tenant.branchIds] },
        active: true,
      },
      select: {
        id: true,
        companyId: true,
        name: true,
        normalizedCode: true,
        timezone: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getBranch(tenant: TenantContext, id: string): Promise<object> {
    const branch = await this.prisma.branch.findFirst({
      where: {
        id: { equals: id, in: [...tenant.branchIds] },
        organizationId: tenant.organizationId,
        active: true,
      },
      select: {
        id: true,
        companyId: true,
        name: true,
        normalizedCode: true,
        timezone: true,
      },
    });
    if (!branch) {
      throw new NotFoundException({
        code: 'BRANCH_NOT_FOUND',
        message: 'The requested branch was not found.',
      });
    }
    return branch;
  }

  listRoles(tenant: TenantContext): Promise<object[]> {
    return this.prisma.role.findMany({
      where: { organizationId: tenant.organizationId },
      select: {
        id: true,
        code: true,
        name: true,
        system: true,
        permissions: {
          select: {
            permission: {
              select: { code: true, description: true, sensitive: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  listPermissions(): Promise<object[]> {
    return this.prisma.permission.findMany({
      select: { code: true, description: true, sensitive: true },
      orderBy: { code: 'asc' },
    });
  }
}
