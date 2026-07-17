import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StockMovementType } from '@prisma/client';
import type { TenantContext } from '../../core/authorization/authorization.types';
import { PrismaService } from '../../database/prisma.service';
import { CoreEntitlementService } from '../subscriptions/core-entitlement.service';
import type { CancelPurchaseBillDto } from './dto/cancel-purchase-bill.dto';
import {
  type CreatePurchaseBillDto,
  type CreatePurchaseBillItemDto,
  PurchaseTaxTreatment,
} from './dto/create-purchase-bill.dto';
import type { CreatePurchaseReturnDto } from './dto/create-purchase-return.dto';
import type { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import type { CreateSupplierDto } from './dto/create-supplier.dto';

type DraftLine = {
  variantId: string;
  description: string;
  hsnSac?: string;
  quantity: Prisma.Decimal;
  unitCost: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  taxableValue: Prisma.Decimal;
  taxRate: Prisma.Decimal;
  cgstAmount: Prisma.Decimal;
  sgstAmount: Prisma.Decimal;
  igstAmount: Prisma.Decimal;
  cessAmount: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
  inputTaxEligible: boolean;
};

type ReturnMoneyField =
  'taxableValue' | 'cgstAmount' | 'sgstAmount' | 'igstAmount' | 'cessAmount';

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEntitlementService,
  ) {}

  listSuppliers(organizationId: string): Promise<object[]> {
    return this.prisma.supplier.findMany({
      where: { organizationId, active: true },
      orderBy: { name: 'asc' },
    });
  }

  async createSupplier(
    organizationId: string,
    input: CreateSupplierDto,
  ): Promise<object> {
    await this.core.assertMutationAllowed(organizationId);
    try {
      return await this.prisma.supplier.create({
        data: {
          organizationId,
          normalizedCode: normalizeCode(input.code),
          name: input.name.trim(),
          normalizedName: normalizeName(input.name),
          gstin: input.gstin?.trim().toUpperCase(),
          phone: input.phone?.trim(),
          email: input.email?.trim().toLowerCase(),
          creditDays: input.creditDays ?? 0,
        },
      });
    } catch (error) {
      if (isUniqueConflict(error)) throw supplierConflict();
      throw error;
    }
  }

  listBills(tenant: TenantContext): Promise<object[]> {
    return this.prisma.purchaseBill.findMany({
      where: {
        organizationId: tenant.organizationId,
        branchId: { in: [...tenant.branchIds] },
      },
      include: { supplier: { select: { id: true, name: true, gstin: true } } },
      orderBy: [{ invoiceDate: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });
  }

  async getBill(tenant: TenantContext, id: string): Promise<object> {
    const bill = await this.prisma.purchaseBill.findFirst({
      where: {
        id,
        organizationId: tenant.organizationId,
        branchId: { in: [...tenant.branchIds] },
      },
      include: {
        supplier: true,
        items: { include: { variant: { include: { product: true } } } },
        returns: { include: { items: true } },
        allocations: { include: { payment: true } },
      },
    });
    if (!bill) throw purchaseNotFound();
    return bill;
  }

  async createDraft(
    tenant: TenantContext,
    input: CreatePurchaseBillDto,
  ): Promise<object> {
    await this.core.assertMutationAllowed(tenant.organizationId);
    const invoiceDate = dateOnly(input.invoiceDate);
    const dueDate = input.dueDate ? dateOnly(input.dueDate) : undefined;
    if (dueDate && dueDate < invoiceDate) {
      throw new ConflictException({
        code: 'INVALID_PURCHASE_DUE_DATE',
        message:
          'The due date cannot be earlier than the supplier invoice date.',
      });
    }
    const uniqueVariantIds = new Set(
      input.items.map(({ variantId }) => variantId),
    );
    if (uniqueVariantIds.size !== input.items.length) {
      throw new ConflictException({
        code: 'DUPLICATE_PURCHASE_VARIANT',
        message: 'A product variant may appear only once in a purchase draft.',
      });
    }

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const [branch, warehouse, supplier, variants] = await Promise.all([
          transaction.branch.findFirst({
            where: {
              organizationId: tenant.organizationId,
              AND: [
                { id: input.branchId },
                { id: { in: [...tenant.branchIds] } },
              ],
              active: true,
            },
          }),
          transaction.warehouse.findFirst({
            where: {
              id: input.warehouseId,
              organizationId: tenant.organizationId,
              branchId: input.branchId,
              active: true,
            },
          }),
          transaction.supplier.findFirst({
            where: {
              id: input.supplierId,
              organizationId: tenant.organizationId,
              active: true,
            },
          }),
          transaction.productVariant.findMany({
            where: {
              id: { in: [...uniqueVariantIds] },
              organizationId: tenant.organizationId,
              active: true,
            },
            include: { product: true },
          }),
        ]);
        if (
          !branch ||
          !warehouse ||
          !supplier ||
          warehouse.companyId !== branch.companyId
        ) {
          throw purchaseNotFound();
        }
        if (variants.length !== uniqueVariantIds.size) throw purchaseNotFound();
        const variantMap = new Map(
          variants.map((variant) => [variant.id, variant]),
        );
        const lines = input.items.map((item) =>
          calculateLine(
            item,
            variantMap.get(item.variantId)!,
            input.taxTreatment,
            item.inputTaxEligible ?? input.inputTaxEligible ?? false,
          ),
        );
        const totals = calculateTotals(lines, input.roundOff ?? 0);
        if (
          input.expectedTotal !== undefined &&
          !totals.totalAmount.equals(money(input.expectedTotal))
        ) {
          throw new ConflictException({
            code: 'PURCHASE_TOTAL_MISMATCH',
            message:
              'The submitted total does not match the server calculation.',
          });
        }
        const bill = await transaction.purchaseBill.create({
          data: {
            organizationId: tenant.organizationId,
            companyId: branch.companyId,
            branchId: branch.id,
            warehouseId: warehouse.id,
            supplierId: supplier.id,
            supplierInvoiceReference: input.supplierInvoiceReference.trim(),
            normalizedReference: normalizeReference(
              input.supplierInvoiceReference,
            ),
            invoiceDate,
            dueDate,
            taxableValue: totals.taxableValue,
            cgstAmount: totals.cgstAmount,
            sgstAmount: totals.sgstAmount,
            igstAmount: totals.igstAmount,
            cessAmount: totals.cessAmount,
            roundOff: totals.roundOff,
            totalAmount: totals.totalAmount,
            outstandingAmount: totals.totalAmount,
            inputTaxEligible: lines.some(
              ({ inputTaxEligible }) => inputTaxEligible,
            ),
          },
        });
        await transaction.purchaseBillItem.createMany({
          data: lines.map((line) => ({
            organizationId: tenant.organizationId,
            purchaseBillId: bill.id,
            ...line,
          })),
        });
        return transaction.purchaseBill.findUniqueOrThrow({
          where: { id: bill.id },
          include: { supplier: true, items: true },
        });
      });
    } catch (error) {
      if (isUniqueConflict(error)) throw purchaseReferenceConflict();
      throw error;
    }
  }

  async postBill(
    tenant: TenantContext,
    actorUserId: string,
    correlationId: string,
    idempotencyKey: string,
    id: string,
  ): Promise<object> {
    await this.core.assertMutationAllowed(tenant.organizationId);
    validateIdempotencyKey(idempotencyKey);
    return this.serializable(async (transaction) => {
      await transaction.$queryRaw(
        Prisma.sql`SELECT "id" FROM "purchase_bills" WHERE "id" = ${id}::uuid AND "organization_id" = ${tenant.organizationId}::uuid FOR UPDATE`,
      );
      const bill = await transaction.purchaseBill.findFirst({
        where: {
          id,
          organizationId: tenant.organizationId,
          branchId: { in: [...tenant.branchIds] },
        },
        include: { items: { include: { variant: true } }, supplier: true },
      });
      if (!bill) throw purchaseNotFound();
      if (bill.status === 'POSTED') {
        if (bill.postingIdempotencyKey !== idempotencyKey) {
          throw new ConflictException({
            code: 'PURCHASE_ALREADY_POSTED',
            message:
              'This purchase bill was already posted by another request.',
          });
        }
        return { bill, movements: [], idempotent: true };
      }
      const keyOwner = await transaction.purchaseBill.findFirst({
        where: {
          organizationId: tenant.organizationId,
          postingIdempotencyKey: idempotencyKey,
        },
      });
      if (keyOwner && keyOwner.id !== bill.id) {
        throw new ConflictException({
          code: 'IDEMPOTENCY_KEY_CONFLICT',
          message:
            'This idempotency key was already used for another purchase bill.',
        });
      }
      if (bill.status !== 'DRAFT' || bill.items.length === 0) {
        throw new ConflictException({
          code: 'PURCHASE_NOT_POSTABLE',
          message: 'Only a non-empty draft purchase bill can be posted.',
        });
      }

      const movements: object[] = [];
      const inventoryLines = bill.items
        .filter(({ variant }) => variant.trackInventory)
        .sort((left, right) => left.variantId.localeCompare(right.variantId));
      for (const item of inventoryLines) {
        await transaction.stockBalance.upsert({
          where: {
            organizationId_warehouseId_variantId: {
              organizationId: tenant.organizationId,
              warehouseId: bill.warehouseId,
              variantId: item.variantId,
            },
          },
          update: {},
          create: {
            organizationId: tenant.organizationId,
            warehouseId: bill.warehouseId,
            variantId: item.variantId,
          },
        });
        await transaction.$queryRaw(
          Prisma.sql`SELECT "quantity" FROM "stock_balances" WHERE "organization_id" = ${tenant.organizationId}::uuid AND "warehouse_id" = ${bill.warehouseId}::uuid AND "variant_id" = ${item.variantId}::uuid FOR UPDATE`,
        );
        const balance = await transaction.stockBalance.findUniqueOrThrow({
          where: {
            organizationId_warehouseId_variantId: {
              organizationId: tenant.organizationId,
              warehouseId: bill.warehouseId,
              variantId: item.variantId,
            },
          },
        });
        const nextQuantity = balance.quantity.plus(item.quantity);
        const averageCost = balance.quantity
          .mul(balance.averageCost)
          .plus(item.quantity.mul(item.unitCost))
          .div(nextQuantity)
          .toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
        const movement = await transaction.stockMovement.create({
          data: {
            organizationId: tenant.organizationId,
            companyId: bill.companyId,
            branchId: bill.branchId,
            warehouseId: bill.warehouseId,
            variantId: item.variantId,
            actorUserId,
            movementType: StockMovementType.PURCHASE_RECEIPT,
            quantity: item.quantity,
            unitCost: item.unitCost,
            occurredAt: new Date(),
            sourceType: 'PURCHASE_BILL',
            sourceId: bill.id,
            idempotencyKey,
          },
        });
        await transaction.stockBalance.update({
          where: {
            organizationId_warehouseId_variantId: {
              organizationId: tenant.organizationId,
              warehouseId: bill.warehouseId,
              variantId: item.variantId,
            },
          },
          data: { quantity: nextQuantity, averageCost },
        });
        movements.push(movement);
      }
      const posted = await transaction.purchaseBill.update({
        where: { id: bill.id },
        data: {
          status: 'POSTED',
          postingIdempotencyKey: idempotencyKey,
          postedAt: new Date(),
          postedByUserId: actorUserId,
        },
        include: { supplier: true, items: true },
      });
      await transaction.auditLog.create({
        data: {
          organizationId: tenant.organizationId,
          actorUserId,
          action: 'PURCHASE_BILL_POSTED',
          targetType: 'PURCHASE_BILL',
          targetId: bill.id,
          correlationId,
          outcome: 'SUCCESS',
          summary: {
            totalAmount: bill.totalAmount.toString(),
            stockMovements: movements.length,
          },
        },
      });
      return { bill: posted, movements, idempotent: false };
    });
  }

  async cancelBill(
    tenant: TenantContext,
    actorUserId: string,
    correlationId: string,
    idempotencyKey: string,
    id: string,
    input: CancelPurchaseBillDto,
  ): Promise<object> {
    await this.core.assertMutationAllowed(tenant.organizationId);
    validateIdempotencyKey(idempotencyKey);
    const reason = input.reason.trim();
    return this.serializable(async (transaction) => {
      await transaction.$queryRaw(
        Prisma.sql`SELECT "id" FROM "purchase_bills" WHERE "id" = ${id}::uuid AND "organization_id" = ${tenant.organizationId}::uuid FOR UPDATE`,
      );
      const bill = await transaction.purchaseBill.findFirst({
        where: {
          id,
          organizationId: tenant.organizationId,
          branchId: { in: [...tenant.branchIds] },
        },
        include: {
          items: { include: { variant: true } },
          allocations: true,
          returns: true,
          supplier: true,
        },
      });
      if (!bill) throw purchaseNotFound();
      if (bill.status === 'CANCELLED') {
        if (
          bill.cancellationIdempotencyKey !== idempotencyKey ||
          bill.cancellationReason !== reason
        ) {
          throw new ConflictException({
            code: 'PURCHASE_ALREADY_CANCELLED',
            message: 'This purchase bill was already cancelled.',
          });
        }
        return { bill, movements: [], idempotent: true };
      }
      const keyOwner = await transaction.purchaseBill.findFirst({
        where: {
          organizationId: tenant.organizationId,
          cancellationIdempotencyKey: idempotencyKey,
        },
      });
      if (keyOwner && keyOwner.id !== bill.id) throw idempotencyConflict();
      if (bill.status !== 'POSTED') {
        throw new ConflictException({
          code: 'PURCHASE_NOT_CANCELLABLE',
          message: 'Only a posted purchase bill can be cancelled.',
        });
      }
      if (
        !bill.paidAmount.isZero() ||
        bill.allocations.length > 0 ||
        !bill.returnedAmount.isZero() ||
        bill.returns.length > 0
      ) {
        throw new ConflictException({
          code: 'PURCHASE_CANCELLATION_HAS_DEPENDENCIES',
          message:
            'A purchase bill with payments or returns cannot be cancelled safely.',
        });
      }

      const receipts = await transaction.stockMovement.findMany({
        where: {
          organizationId: tenant.organizationId,
          sourceType: 'PURCHASE_BILL',
          sourceId: bill.id,
          movementType: StockMovementType.PURCHASE_RECEIPT,
        },
      });
      const receiptByVariant = new Map(
        receipts.map((movement) => [movement.variantId, movement]),
      );
      const movements: object[] = [];
      const inventoryLines = bill.items
        .filter(({ variant }) => variant.trackInventory)
        .sort((left, right) => left.variantId.localeCompare(right.variantId));
      for (const item of inventoryLines) {
        const receipt = receiptByVariant.get(item.variantId);
        if (!receipt) {
          throw new ConflictException({
            code: 'PURCHASE_RECEIPT_NOT_FOUND',
            message: 'The original stock receipt could not be reconciled.',
          });
        }
        await transaction.$queryRaw(
          Prisma.sql`SELECT "quantity" FROM "stock_balances" WHERE "organization_id" = ${tenant.organizationId}::uuid AND "warehouse_id" = ${bill.warehouseId}::uuid AND "variant_id" = ${item.variantId}::uuid FOR UPDATE`,
        );
        const balance = await transaction.stockBalance.findUniqueOrThrow({
          where: {
            organizationId_warehouseId_variantId: {
              organizationId: tenant.organizationId,
              warehouseId: bill.warehouseId,
              variantId: item.variantId,
            },
          },
        });
        if (balance.quantity.lessThan(item.quantity))
          throw insufficientPurchaseStock('cancel');
        const movement = await transaction.stockMovement.create({
          data: {
            organizationId: tenant.organizationId,
            companyId: bill.companyId,
            branchId: bill.branchId,
            warehouseId: bill.warehouseId,
            variantId: item.variantId,
            actorUserId,
            movementType: StockMovementType.REVERSAL,
            quantity: item.quantity.negated(),
            unitCost: item.unitCost,
            occurredAt: new Date(),
            sourceType: 'PURCHASE_BILL_CANCELLATION',
            sourceId: bill.id,
            idempotencyKey,
            reversalOfId: receipt.id,
          },
        });
        await transaction.stockBalance.update({
          where: {
            organizationId_warehouseId_variantId: {
              organizationId: tenant.organizationId,
              warehouseId: bill.warehouseId,
              variantId: item.variantId,
            },
          },
          data: { quantity: balance.quantity.minus(item.quantity) },
        });
        movements.push(movement);
      }
      const cancelled = await transaction.purchaseBill.update({
        where: { id: bill.id },
        data: {
          status: 'CANCELLED',
          outstandingAmount: 0,
          cancellationIdempotencyKey: idempotencyKey,
          cancelledAt: new Date(),
          cancelledByUserId: actorUserId,
          cancellationReason: reason,
        },
        include: { supplier: true, items: true },
      });
      await transaction.auditLog.create({
        data: {
          organizationId: tenant.organizationId,
          actorUserId,
          action: 'PURCHASE_BILL_CANCELLED',
          targetType: 'PURCHASE_BILL',
          targetId: bill.id,
          correlationId,
          outcome: 'SUCCESS',
          summary: { reason, stockMovements: movements.length },
        },
      });
      return { bill: cancelled, movements, idempotent: false };
    });
  }

  async createReturn(
    tenant: TenantContext,
    actorUserId: string,
    correlationId: string,
    idempotencyKey: string,
    input: CreatePurchaseReturnDto,
  ): Promise<object> {
    await this.core.assertMutationAllowed(tenant.organizationId);
    validateIdempotencyKey(idempotencyKey);
    const uniqueItemIds = new Set(
      input.items.map(({ purchaseBillItemId }) => purchaseBillItemId),
    );
    if (uniqueItemIds.size !== input.items.length) {
      throw new ConflictException({
        code: 'DUPLICATE_PURCHASE_RETURN_ITEM',
        message: 'A source bill item may appear only once in a return.',
      });
    }
    const returnDate = dateOnly(input.returnDate);
    const reason = input.reason.trim();

    return this.serializable(async (transaction) => {
      const existing = await transaction.purchaseReturn.findUnique({
        where: {
          organizationId_idempotencyKey: {
            organizationId: tenant.organizationId,
            idempotencyKey,
          },
        },
        include: { items: true },
      });
      if (existing) {
        if (!tenant.branchIds.includes(existing.branchId))
          throw purchaseNotFound();
        if (!samePurchaseReturn(existing, input, reason, returnDate))
          throw idempotencyConflict();
        return { purchaseReturn: existing, movements: [], idempotent: true };
      }

      await transaction.$queryRaw(
        Prisma.sql`SELECT "id" FROM "purchase_bills" WHERE "id" = ${input.purchaseBillId}::uuid AND "organization_id" = ${tenant.organizationId}::uuid FOR UPDATE`,
      );
      const bill = await transaction.purchaseBill.findFirst({
        where: {
          id: input.purchaseBillId,
          organizationId: tenant.organizationId,
          branchId: { in: [...tenant.branchIds] },
        },
        include: {
          items: { include: { variant: true, returnItems: true } },
          returns: true,
        },
      });
      if (!bill) throw purchaseNotFound();
      if (bill.status !== 'POSTED') {
        throw new ConflictException({
          code: 'PURCHASE_NOT_RETURNABLE',
          message: 'Only a posted purchase bill can receive a return.',
        });
      }
      if (returnDate < bill.invoiceDate) {
        throw new ConflictException({
          code: 'INVALID_PURCHASE_RETURN_DATE',
          message: 'The return date cannot be earlier than the purchase date.',
        });
      }
      const itemMap = new Map(bill.items.map((item) => [item.id, item]));
      if ([...uniqueItemIds].some((itemId) => !itemMap.has(itemId)))
        throw purchaseNotFound();

      const requestedQuantities = new Map(
        input.items.map((item) => [
          item.purchaseBillItemId,
          new Prisma.Decimal(item.quantity),
        ]),
      );
      const returnLines = input.items
        .map((requested) => {
          const source = itemMap.get(requested.purchaseBillItemId)!;
          const previousQuantity = sumDecimals(
            source.returnItems.map(({ quantity }) => quantity),
          );
          const quantity = new Prisma.Decimal(requested.quantity);
          if (previousQuantity.plus(quantity).greaterThan(source.quantity))
            throw new ConflictException({
              code: 'PURCHASE_RETURN_QUANTITY_EXCEEDED',
              message:
                'The return quantity exceeds the remaining source quantity.',
            });
          const finalQuantity = previousQuantity
            .plus(quantity)
            .equals(source.quantity);
          const component = (field: ReturnMoneyField) =>
            finalQuantity
              ? source[field].minus(
                  sumDecimals(source.returnItems.map((item) => item[field])),
                )
              : source[field]
                  .mul(quantity)
                  .div(source.quantity)
                  .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
          const taxableValue = component('taxableValue');
          const cgstAmount = component('cgstAmount');
          const sgstAmount = component('sgstAmount');
          const igstAmount = component('igstAmount');
          const cessAmount = component('cessAmount');
          return {
            purchaseBillItemId: source.id,
            variantId: source.variantId,
            quantity,
            unitCost: source.unitCost,
            taxableValue,
            cgstAmount,
            sgstAmount,
            igstAmount,
            cessAmount,
            lineTotal: taxableValue
              .plus(cgstAmount)
              .plus(sgstAmount)
              .plus(igstAmount)
              .plus(cessAmount),
            trackInventory: source.variant.trackInventory,
          };
        })
        .sort((left, right) => left.variantId.localeCompare(right.variantId));
      const fullyReturned = bill.items.every((item) =>
        sumDecimals(item.returnItems.map(({ quantity }) => quantity))
          .plus(requestedQuantities.get(item.id) ?? 0)
          .equals(item.quantity),
      );
      const priorRoundOff = sumDecimals(
        bill.returns.map(({ roundOff }) => roundOff),
      );
      const roundOff = fullyReturned
        ? bill.roundOff.minus(priorRoundOff)
        : new Prisma.Decimal(0);
      const totals = returnTotals(returnLines, roundOff);
      if (
        input.expectedTotal !== undefined &&
        !totals.totalAmount.equals(money(input.expectedTotal))
      ) {
        throw new ConflictException({
          code: 'PURCHASE_RETURN_TOTAL_MISMATCH',
          message:
            'The submitted return total does not match the server calculation.',
        });
      }
      if (
        bill.returnedAmount
          .plus(totals.totalAmount)
          .greaterThan(bill.totalAmount)
      )
        throw new ConflictException({
          code: 'PURCHASE_RETURN_AMOUNT_EXCEEDED',
          message: 'The return amount exceeds the remaining purchase value.',
        });
      const appliedToPayableAmount = bill.outstandingAmount.lessThan(
        totals.totalAmount,
      )
        ? bill.outstandingAmount
        : totals.totalAmount;
      const supplierCreditAmount = totals.totalAmount.minus(
        appliedToPayableAmount,
      );
      const purchaseReturn = await transaction.purchaseReturn.create({
        data: {
          organizationId: tenant.organizationId,
          companyId: bill.companyId,
          branchId: bill.branchId,
          warehouseId: bill.warehouseId,
          supplierId: bill.supplierId,
          purchaseBillId: bill.id,
          returnDate,
          reason,
          ...totals,
          appliedToPayableAmount,
          supplierCreditAmount,
          idempotencyKey,
          postedByUserId: actorUserId,
        },
      });
      await transaction.purchaseReturnItem.createMany({
        data: returnLines.map((line) => ({
          organizationId: tenant.organizationId,
          purchaseReturnId: purchaseReturn.id,
          purchaseBillItemId: line.purchaseBillItemId,
          variantId: line.variantId,
          quantity: line.quantity,
          unitCost: line.unitCost,
          taxableValue: line.taxableValue,
          cgstAmount: line.cgstAmount,
          sgstAmount: line.sgstAmount,
          igstAmount: line.igstAmount,
          cessAmount: line.cessAmount,
          lineTotal: line.lineTotal,
        })),
      });

      const movements: object[] = [];
      for (const line of returnLines.filter(
        ({ trackInventory }) => trackInventory,
      )) {
        await transaction.$queryRaw(
          Prisma.sql`SELECT "quantity" FROM "stock_balances" WHERE "organization_id" = ${tenant.organizationId}::uuid AND "warehouse_id" = ${bill.warehouseId}::uuid AND "variant_id" = ${line.variantId}::uuid FOR UPDATE`,
        );
        const balance = await transaction.stockBalance.findUniqueOrThrow({
          where: {
            organizationId_warehouseId_variantId: {
              organizationId: tenant.organizationId,
              warehouseId: bill.warehouseId,
              variantId: line.variantId,
            },
          },
        });
        if (balance.quantity.lessThan(line.quantity))
          throw insufficientPurchaseStock('return');
        const movement = await transaction.stockMovement.create({
          data: {
            organizationId: tenant.organizationId,
            companyId: bill.companyId,
            branchId: bill.branchId,
            warehouseId: bill.warehouseId,
            variantId: line.variantId,
            actorUserId,
            movementType: StockMovementType.PURCHASE_RETURN,
            quantity: line.quantity.negated(),
            unitCost: line.unitCost,
            occurredAt: new Date(),
            sourceType: 'PURCHASE_RETURN',
            sourceId: purchaseReturn.id,
            idempotencyKey,
          },
        });
        await transaction.stockBalance.update({
          where: {
            organizationId_warehouseId_variantId: {
              organizationId: tenant.organizationId,
              warehouseId: bill.warehouseId,
              variantId: line.variantId,
            },
          },
          data: { quantity: balance.quantity.minus(line.quantity) },
        });
        movements.push(movement);
      }
      await transaction.purchaseBill.update({
        where: { id: bill.id },
        data: {
          returnedAmount: bill.returnedAmount.plus(totals.totalAmount),
          outstandingAmount: bill.outstandingAmount.minus(
            appliedToPayableAmount,
          ),
        },
      });
      await transaction.auditLog.create({
        data: {
          organizationId: tenant.organizationId,
          actorUserId,
          action: 'PURCHASE_RETURN_POSTED',
          targetType: 'PURCHASE_RETURN',
          targetId: purchaseReturn.id,
          correlationId,
          outcome: 'SUCCESS',
          summary: {
            purchaseBillId: bill.id,
            reason,
            totalAmount: totals.totalAmount.toString(),
            appliedToPayableAmount: appliedToPayableAmount.toString(),
            supplierCreditAmount: supplierCreditAmount.toString(),
            stockMovements: movements.length,
          },
        },
      });
      const created = await transaction.purchaseReturn.findUniqueOrThrow({
        where: { id: purchaseReturn.id },
        include: { items: true },
      });
      return { purchaseReturn: created, movements, idempotent: false };
    });
  }

  async paySupplier(
    tenant: TenantContext,
    actorUserId: string,
    correlationId: string,
    idempotencyKey: string,
    input: CreateSupplierPaymentDto,
  ): Promise<object> {
    await this.core.assertMutationAllowed(tenant.organizationId);
    validateIdempotencyKey(idempotencyKey);
    const uniqueBillIds = new Set(
      input.allocations.map(({ purchaseBillId }) => purchaseBillId),
    );
    if (uniqueBillIds.size !== input.allocations.length) {
      throw new ConflictException({
        code: 'DUPLICATE_PAYMENT_ALLOCATION',
        message: 'A payment may allocate to each purchase bill only once.',
      });
    }
    const allocationTotal = input.allocations.reduce(
      (total, allocation) => total.plus(allocation.amount),
      new Prisma.Decimal(0),
    );
    if (allocationTotal.greaterThan(input.amount)) throw allocationConflict();

    return this.serializable(async (transaction) => {
      const existing = await transaction.supplierPayment.findUnique({
        where: {
          organizationId_idempotencyKey: {
            organizationId: tenant.organizationId,
            idempotencyKey,
          },
        },
        include: { allocations: true },
      });
      if (existing) {
        if (!samePayment(existing, input)) {
          throw new ConflictException({
            code: 'IDEMPOTENCY_KEY_CONFLICT',
            message:
              'This idempotency key was already used for another payment.',
          });
        }
        return { payment: existing, idempotent: true };
      }

      const [branch, supplier] = await Promise.all([
        transaction.branch.findFirst({
          where: {
            organizationId: tenant.organizationId,
            AND: [
              { id: input.branchId },
              { id: { in: [...tenant.branchIds] } },
            ],
            active: true,
          },
        }),
        transaction.supplier.findFirst({
          where: {
            id: input.supplierId,
            organizationId: tenant.organizationId,
            active: true,
          },
        }),
      ]);
      if (!branch || !supplier) throw purchaseNotFound();

      const bills = [];
      for (const purchaseBillId of [...uniqueBillIds].sort()) {
        await transaction.$queryRaw(
          Prisma.sql`SELECT "id" FROM "purchase_bills" WHERE "id" = ${purchaseBillId}::uuid AND "organization_id" = ${tenant.organizationId}::uuid FOR UPDATE`,
        );
        const bill = await transaction.purchaseBill.findFirst({
          where: {
            id: purchaseBillId,
            organizationId: tenant.organizationId,
            companyId: branch.companyId,
            branchId: branch.id,
            supplierId: supplier.id,
            status: 'POSTED',
          },
        });
        if (!bill) throw purchaseNotFound();
        const allocation = input.allocations.find(
          (item) => item.purchaseBillId === bill.id,
        )!;
        if (bill.outstandingAmount.lessThan(allocation.amount))
          throw allocationConflict();
        bills.push({ bill, amount: money(allocation.amount) });
      }

      const createdPayment = await transaction.supplierPayment.create({
        data: {
          organizationId: tenant.organizationId,
          companyId: branch.companyId,
          branchId: branch.id,
          supplierId: supplier.id,
          actorUserId,
          method: input.method,
          amount: money(input.amount),
          reference: input.reference?.trim(),
          paidAt: new Date(input.paidAt),
          idempotencyKey,
        },
      });
      await transaction.supplierPaymentAllocation.createMany({
        data: bills.map(({ bill, amount }) => ({
          organizationId: tenant.organizationId,
          paymentId: createdPayment.id,
          purchaseBillId: bill.id,
          amount,
        })),
      });
      for (const { bill, amount } of bills) {
        await transaction.purchaseBill.update({
          where: { id: bill.id },
          data: {
            paidAmount: bill.paidAmount.plus(amount),
            outstandingAmount: bill.outstandingAmount.minus(amount),
          },
        });
      }
      await transaction.auditLog.create({
        data: {
          organizationId: tenant.organizationId,
          actorUserId,
          action: 'SUPPLIER_PAYMENT_POSTED',
          targetType: 'SUPPLIER_PAYMENT',
          targetId: createdPayment.id,
          correlationId,
          outcome: 'SUCCESS',
          summary: {
            amount: createdPayment.amount.toString(),
            allocations: bills.length,
          },
        },
      });
      const payment = await transaction.supplierPayment.findUniqueOrThrow({
        where: { id: createdPayment.id },
        include: { allocations: true },
      });
      return { payment, idempotent: false };
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
    throw new Error('Serializable purchase transaction retry loop exhausted.');
  }
}

function calculateLine(
  input: CreatePurchaseBillItemDto,
  variant: {
    name: string | null;
    product: { name: string; hsnSac: string | null };
  },
  taxTreatment: PurchaseTaxTreatment,
  inputTaxEligible: boolean,
): DraftLine {
  const quantity = new Prisma.Decimal(input.quantity);
  const unitCost = new Prisma.Decimal(input.unitCost);
  const gross = quantity.mul(unitCost);
  const discountAmount = money(input.discountAmount ?? 0);
  if (discountAmount.greaterThan(gross)) {
    throw new ConflictException({
      code: 'INVALID_PURCHASE_DISCOUNT',
      message: 'A line discount cannot exceed the line value.',
    });
  }
  const taxableValue = gross
    .minus(discountAmount)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  const taxRate = money(input.taxRate);
  const tax = taxableValue
    .mul(taxRate)
    .div(100)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  const cessAmount = taxableValue
    .mul(input.cessRate ?? 0)
    .div(100)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  const cgstAmount =
    taxTreatment === PurchaseTaxTreatment.INTRASTATE
      ? tax.div(2).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
      : new Prisma.Decimal(0);
  const sgstAmount =
    taxTreatment === PurchaseTaxTreatment.INTRASTATE
      ? tax.minus(cgstAmount)
      : new Prisma.Decimal(0);
  const igstAmount =
    taxTreatment === PurchaseTaxTreatment.INTERSTATE
      ? tax
      : new Prisma.Decimal(0);
  return {
    variantId: input.variantId,
    description:
      input.description?.trim() || variant.name || variant.product.name,
    hsnSac: variant.product.hsnSac ?? undefined,
    quantity,
    unitCost,
    discountAmount,
    taxableValue,
    taxRate,
    cgstAmount,
    sgstAmount,
    igstAmount,
    cessAmount,
    lineTotal: taxableValue.plus(tax).plus(cessAmount),
    inputTaxEligible,
  };
}

function calculateTotals(lines: DraftLine[], roundOffInput: number) {
  const sum = (select: (line: DraftLine) => Prisma.Decimal) =>
    lines.reduce(
      (total, line) => total.plus(select(line)),
      new Prisma.Decimal(0),
    );
  const roundOff = money(roundOffInput);
  return {
    taxableValue: sum(({ taxableValue }) => taxableValue),
    cgstAmount: sum(({ cgstAmount }) => cgstAmount),
    sgstAmount: sum(({ sgstAmount }) => sgstAmount),
    igstAmount: sum(({ igstAmount }) => igstAmount),
    cessAmount: sum(({ cessAmount }) => cessAmount),
    roundOff,
    totalAmount: sum(({ lineTotal }) => lineTotal).plus(roundOff),
  };
}

function samePayment(
  existing: {
    branchId: string;
    supplierId: string;
    method: string;
    amount: Prisma.Decimal;
    reference: string | null;
    paidAt: Date;
    allocations: Array<{ purchaseBillId: string; amount: Prisma.Decimal }>;
  },
  input: CreateSupplierPaymentDto,
): boolean {
  if (
    existing.branchId !== input.branchId ||
    existing.supplierId !== input.supplierId ||
    existing.method !== input.method ||
    !existing.amount.equals(money(input.amount)) ||
    existing.reference !== (input.reference?.trim() ?? null) ||
    existing.paidAt.getTime() !== new Date(input.paidAt).getTime() ||
    existing.allocations.length !== input.allocations.length
  ) {
    return false;
  }
  const allocations = new Map(
    existing.allocations.map((item) => [item.purchaseBillId, item.amount]),
  );
  return input.allocations.every(
    (item) =>
      allocations.get(item.purchaseBillId)?.equals(money(item.amount)) === true,
  );
}

function samePurchaseReturn(
  existing: {
    purchaseBillId: string;
    returnDate: Date;
    reason: string;
    items: Array<{ purchaseBillItemId: string; quantity: Prisma.Decimal }>;
  },
  input: CreatePurchaseReturnDto,
  reason: string,
  returnDate: Date,
): boolean {
  if (
    existing.purchaseBillId !== input.purchaseBillId ||
    existing.returnDate.getTime() !== returnDate.getTime() ||
    existing.reason !== reason ||
    existing.items.length !== input.items.length
  ) {
    return false;
  }
  const quantities = new Map(
    existing.items.map((item) => [item.purchaseBillItemId, item.quantity]),
  );
  return input.items.every(
    (item) =>
      quantities
        .get(item.purchaseBillItemId)
        ?.equals(new Prisma.Decimal(item.quantity)) === true,
  );
}

function sumDecimals(values: Array<Prisma.Decimal | number>): Prisma.Decimal {
  return values.reduce<Prisma.Decimal>(
    (total, value) => total.plus(value),
    new Prisma.Decimal(0),
  );
}

function returnTotals(
  lines: Array<{
    taxableValue: Prisma.Decimal;
    cgstAmount: Prisma.Decimal;
    sgstAmount: Prisma.Decimal;
    igstAmount: Prisma.Decimal;
    cessAmount: Prisma.Decimal;
  }>,
  roundOff: Prisma.Decimal,
) {
  const sum = (select: (line: (typeof lines)[number]) => Prisma.Decimal) =>
    sumDecimals(lines.map(select));
  const taxableValue = sum(({ taxableValue }) => taxableValue);
  const cgstAmount = sum(({ cgstAmount }) => cgstAmount);
  const sgstAmount = sum(({ sgstAmount }) => sgstAmount);
  const igstAmount = sum(({ igstAmount }) => igstAmount);
  const cessAmount = sum(({ cessAmount }) => cessAmount);
  return {
    taxableValue,
    cgstAmount,
    sgstAmount,
    igstAmount,
    cessAmount,
    roundOff,
    totalAmount: taxableValue
      .plus(cgstAmount)
      .plus(sgstAmount)
      .plus(igstAmount)
      .plus(cessAmount)
      .plus(roundOff),
  };
}

function money(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value).toDecimalPlaces(
    2,
    Prisma.Decimal.ROUND_HALF_UP,
  );
}

function dateOnly(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '-');
}

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase('en-IN').replace(/\s+/g, ' ');
}

function normalizeReference(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, ' ');
}

function validateIdempotencyKey(value: string): void {
  if (!value?.trim() || value.length > 120) {
    throw new ConflictException({
      code: 'IDEMPOTENCY_KEY_REQUIRED',
      message: 'A valid Idempotency-Key header is required.',
    });
  }
}

function purchaseNotFound(): NotFoundException {
  return new NotFoundException({
    code: 'PURCHASE_RESOURCE_NOT_FOUND',
    message: 'The requested purchase resource was not found.',
  });
}

function supplierConflict(): ConflictException {
  return new ConflictException({
    code: 'SUPPLIER_IDENTIFIER_CONFLICT',
    message: 'The supplier code already exists.',
  });
}

function purchaseReferenceConflict(): ConflictException {
  return new ConflictException({
    code: 'PURCHASE_REFERENCE_CONFLICT',
    message: 'This supplier invoice reference already exists for the company.',
  });
}

function allocationConflict(): ConflictException {
  return new ConflictException({
    code: 'PAYMENT_ALLOCATION_EXCEEDS_BALANCE',
    message:
      'The payment allocation exceeds the available payment or bill balance.',
  });
}

function idempotencyConflict(): ConflictException {
  return new ConflictException({
    code: 'IDEMPOTENCY_KEY_CONFLICT',
    message: 'This idempotency key was already used for another request.',
  });
}

function insufficientPurchaseStock(
  action: 'cancel' | 'return',
): ConflictException {
  return new ConflictException({
    code: 'INSUFFICIENT_STOCK_FOR_PURCHASE_COMPENSATION',
    message: `The purchase cannot be ${action === 'cancel' ? 'cancelled' : 'returned'} because the received stock is no longer available.`,
  });
}

function isUniqueConflict(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
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
