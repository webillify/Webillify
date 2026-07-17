import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StockMovementType } from '@prisma/client';
import type { TenantContext } from '../../core/authorization/authorization.types';
import { PrismaService } from '../../database/prisma.service';
import { CoreEntitlementService } from '../subscriptions/core-entitlement.service';
import {
  type CreatePurchaseBillDto,
  type CreatePurchaseBillItemDto,
  PurchaseTaxTreatment,
} from './dto/create-purchase-bill.dto';
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
