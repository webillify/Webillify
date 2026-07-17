import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StockMovementType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { TenantContext } from '../../core/authorization/authorization.types';
import { CoreEntitlementService } from '../subscriptions/core-entitlement.service';
import type { StockAdjustmentDto } from './dto/stock-adjustment.dto';

@Injectable()
export class StockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEntitlementService,
  ) {}

  listBalances(tenant: TenantContext): Promise<object[]> {
    return this.prisma.stockBalance.findMany({
      where: {
        organizationId: tenant.organizationId,
        warehouse: { branchId: { in: [...tenant.branchIds] }, active: true },
      },
      include: {
        warehouse: { select: { id: true, name: true, branchId: true } },
        variant: {
          select: {
            id: true,
            sku: true,
            name: true,
            product: { select: { name: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  listMovements(tenant: TenantContext): Promise<object[]> {
    return this.prisma.stockMovement.findMany({
      where: {
        organizationId: tenant.organizationId,
        branchId: { in: [...tenant.branchIds] },
      },
      include: {
        warehouse: { select: { name: true } },
        variant: { select: { sku: true, product: { select: { name: true } } } },
      },
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });
  }

  async adjust(
    tenant: TenantContext,
    actorUserId: string,
    correlationId: string,
    idempotencyKey: string,
    input: StockAdjustmentDto,
  ): Promise<object> {
    await this.core.assertMutationAllowed(tenant.organizationId);
    if (!idempotencyKey || idempotencyKey.length > 120)
      throw new ConflictException({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message: 'A valid Idempotency-Key header is required.',
      });
    const adjustmentTypes: StockMovementType[] = [
      StockMovementType.ADJUSTMENT_IN,
      StockMovementType.ADJUSTMENT_OUT,
    ];
    if (!adjustmentTypes.includes(input.movementType))
      throw new ConflictException({
        code: 'INVALID_ADJUSTMENT_TYPE',
        message: 'Only reviewed adjustment-in or adjustment-out is allowed.',
      });
    return this.serializable(async (transaction) => {
      const warehouse = await transaction.warehouse.findFirst({
        where: {
          id: input.warehouseId,
          organizationId: tenant.organizationId,
          branchId: { in: [...tenant.branchIds] },
          active: true,
        },
      });
      const variant = await transaction.productVariant.findFirst({
        where: {
          id: input.variantId,
          organizationId: tenant.organizationId,
          active: true,
        },
      });
      if (!warehouse || !variant) throw stockResourceNotFound();

      await transaction.stockBalance.upsert({
        where: {
          organizationId_warehouseId_variantId: {
            organizationId: tenant.organizationId,
            warehouseId: warehouse.id,
            variantId: variant.id,
          },
        },
        update: {},
        create: {
          organizationId: tenant.organizationId,
          warehouseId: warehouse.id,
          variantId: variant.id,
        },
      });
      await transaction.$queryRaw(
        Prisma.sql`SELECT "quantity" FROM "stock_balances" WHERE "organization_id" = ${tenant.organizationId}::uuid AND "warehouse_id" = ${warehouse.id}::uuid AND "variant_id" = ${variant.id}::uuid FOR UPDATE`,
      );
      const existing = await transaction.stockMovement.findFirst({
        where: { organizationId: tenant.organizationId, idempotencyKey },
      });
      const balance = await transaction.stockBalance.findUniqueOrThrow({
        where: {
          organizationId_warehouseId_variantId: {
            organizationId: tenant.organizationId,
            warehouseId: warehouse.id,
            variantId: variant.id,
          },
        },
      });
      if (existing) {
        if (
          existing.warehouseId !== warehouse.id ||
          existing.variantId !== variant.id ||
          existing.movementType !== input.movementType ||
          Math.abs(existing.quantity.toNumber()) !== input.quantity
        )
          throw new ConflictException({
            code: 'IDEMPOTENCY_KEY_CONFLICT',
            message:
              'This idempotency key was already used for another request.',
          });
        return { movement: existing, balance, idempotent: true };
      }

      const currentQuantity = balance.quantity.toNumber();
      const delta =
        input.movementType === StockMovementType.ADJUSTMENT_IN
          ? input.quantity
          : -input.quantity;
      const nextQuantity = currentQuantity + delta;
      if (nextQuantity < 0)
        throw new ConflictException({
          code: 'INSUFFICIENT_STOCK',
          message: 'This adjustment would make stock negative.',
        });
      const averageCost =
        delta > 0 && nextQuantity > 0
          ? (currentQuantity * balance.averageCost.toNumber() +
              input.quantity * input.unitCost) /
            nextQuantity
          : balance.averageCost.toNumber();
      const movement = await transaction.stockMovement.create({
        data: {
          organizationId: tenant.organizationId,
          companyId: warehouse.companyId,
          branchId: warehouse.branchId,
          warehouseId: warehouse.id,
          variantId: variant.id,
          actorUserId,
          movementType: input.movementType,
          quantity: delta,
          unitCost: input.unitCost,
          occurredAt: new Date(),
          sourceType: 'MANUAL_ADJUSTMENT',
          sourceId: input.sourceId,
          idempotencyKey,
        },
      });
      const updatedBalance = await transaction.stockBalance.update({
        where: {
          organizationId_warehouseId_variantId: {
            organizationId: tenant.organizationId,
            warehouseId: warehouse.id,
            variantId: variant.id,
          },
        },
        data: { quantity: nextQuantity, averageCost },
      });
      await transaction.auditLog.create({
        data: {
          organizationId: tenant.organizationId,
          actorUserId,
          action: 'STOCK_ADJUSTED',
          targetType: 'STOCK_MOVEMENT',
          targetId: movement.id,
          correlationId,
          outcome: 'SUCCESS',
          summary: { reason: input.reason, quantity: delta },
        },
      });
      return { movement, balance: updatedBalance, idempotent: false };
    });
  }

  private async serializable<T>(
    operation: (transaction: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        if (!isSerializationConflict(error) || attempt === 3) throw error;
      }
    }
    throw new Error('Serializable stock transaction retry loop exhausted.');
  }
}

function stockResourceNotFound(): NotFoundException {
  return new NotFoundException({
    code: 'STOCK_RESOURCE_NOT_FOUND',
    message: 'The requested stock resource was not found.',
  });
}

function isSerializationConflict(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error))
    return false;
  if (error.code === 'P2034') return true;
  const metadata = 'meta' in error ? error.meta : undefined;
  return (
    error.code === 'P2010' &&
    typeof metadata === 'object' &&
    metadata !== null &&
    'code' in metadata &&
    metadata.code === '40001'
  );
}
