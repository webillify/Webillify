import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentMethod,
  PriceTaxMode,
  Prisma,
  StockMovementType,
  TaxTreatment,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import type { TenantContext } from '../../core/authorization/authorization.types';
import { PrismaService } from '../../database/prisma.service';
import { CoreEntitlementService } from '../subscriptions/core-entitlement.service';
import type { OpenPosSessionDto } from './dto/open-pos-session.dto';
import type {
  PostSalesInvoiceDto,
  PostSalesInvoiceItemDto,
} from './dto/post-sales-invoice.dto';

type SalesLine = {
  variantId: string;
  description: string;
  hsnSac?: string;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  grossAmount: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  taxableValue: Prisma.Decimal;
  taxRate: Prisma.Decimal;
  cgstAmount: Prisma.Decimal;
  sgstAmount: Prisma.Decimal;
  igstAmount: Prisma.Decimal;
  cessAmount: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
  unitCost: Prisma.Decimal;
  costAmount: Prisma.Decimal;
  trackInventory: boolean;
};

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEntitlementService,
  ) {}

  listSessions(tenant: TenantContext): Promise<object[]> {
    return this.prisma.posSession.findMany({
      where: {
        organizationId: tenant.organizationId,
        branchId: { in: [...tenant.branchIds] },
      },
      include: {
        warehouse: { select: { id: true, name: true } },
        openedBy: { select: { id: true, displayName: true } },
      },
      orderBy: { openedAt: 'desc' },
      take: 100,
    });
  }

  async openSession(
    tenant: TenantContext,
    actorUserId: string,
    correlationId: string,
    idempotencyKey: string,
    input: OpenPosSessionDto,
  ): Promise<object> {
    await this.core.assertMutationAllowed(tenant.organizationId);
    validateIdempotencyKey(idempotencyKey);
    const registerCode = normalizeCode(input.registerCode);
    const openingCash = money(input.openingCash);
    try {
      return await this.serializable(async (transaction) => {
        const existing = await transaction.posSession.findUnique({
          where: {
            organizationId_openingIdempotencyKey: {
              organizationId: tenant.organizationId,
              openingIdempotencyKey: idempotencyKey,
            },
          },
        });
        if (existing) {
          if (!tenant.branchIds.includes(existing.branchId))
            throw salesNotFound();
          if (
            existing.branchId !== input.branchId ||
            existing.warehouseId !== input.warehouseId ||
            existing.registerCode !== registerCode ||
            !existing.openingCash.equals(openingCash)
          )
            throw idempotencyConflict();
          return { session: existing, idempotent: true };
        }
        const [branch, warehouse] = await Promise.all([
          transaction.branch.findFirst({
            where: {
              id: input.branchId,
              organizationId: tenant.organizationId,
              AND: [{ id: { in: [...tenant.branchIds] } }],
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
        ]);
        if (!branch || !warehouse || branch.companyId !== warehouse.companyId)
          throw salesNotFound();
        const session = await transaction.posSession.create({
          data: {
            organizationId: tenant.organizationId,
            companyId: branch.companyId,
            branchId: branch.id,
            warehouseId: warehouse.id,
            openedByUserId: actorUserId,
            registerCode,
            openingIdempotencyKey: idempotencyKey,
            openingCash,
          },
        });
        await transaction.auditLog.create({
          data: {
            organizationId: tenant.organizationId,
            actorUserId,
            action: 'POS_SESSION_OPENED',
            targetType: 'POS_SESSION',
            targetId: session.id,
            correlationId,
            outcome: 'SUCCESS',
            summary: { registerCode, openingCash: openingCash.toString() },
          },
        });
        return { session, idempotent: false };
      });
    } catch (error) {
      if (isUniqueConflict(error)) {
        throw new ConflictException({
          code: 'POS_SESSION_ALREADY_OPEN',
          message: 'This register already has an open POS session.',
        });
      }
      throw error;
    }
  }

  listInvoices(tenant: TenantContext): Promise<object[]> {
    return this.prisma.salesInvoice.findMany({
      where: {
        organizationId: tenant.organizationId,
        branchId: { in: [...tenant.branchIds] },
      },
      include: { customer: true, payments: true },
      orderBy: { invoiceDate: 'desc' },
      take: 200,
    });
  }

  async getInvoice(tenant: TenantContext, id: string): Promise<object> {
    const invoice = await this.prisma.salesInvoice.findFirst({
      where: {
        id,
        organizationId: tenant.organizationId,
        branchId: { in: [...tenant.branchIds] },
      },
      include: {
        customer: true,
        items: { include: { variant: { include: { product: true } } } },
        payments: true,
        posSession: true,
      },
    });
    if (!invoice) throw salesNotFound();
    return invoice;
  }

  async postInvoice(
    tenant: TenantContext,
    actorUserId: string,
    correlationId: string,
    idempotencyKey: string,
    input: PostSalesInvoiceDto,
  ): Promise<object> {
    await this.core.assertMutationAllowed(tenant.organizationId);
    validateIdempotencyKey(idempotencyKey);
    const uniqueVariantIds = new Set(
      input.items.map(({ variantId }) => variantId),
    );
    if (uniqueVariantIds.size !== input.items.length) {
      throw new ConflictException({
        code: 'DUPLICATE_SALES_VARIANT',
        message: 'A product variant may appear only once in a sales invoice.',
      });
    }
    const requestHash = hashRequest(input);

    return this.serializable(async (transaction) => {
      const existing = await transaction.salesInvoice.findUnique({
        where: {
          organizationId_idempotencyKey: {
            organizationId: tenant.organizationId,
            idempotencyKey,
          },
        },
        include: { items: true, payments: true, customer: true },
      });
      if (existing) {
        if (!tenant.branchIds.includes(existing.branchId))
          throw salesNotFound();
        if (existing.requestHash !== requestHash) throw idempotencyConflict();
        return { invoice: existing, movements: [], idempotent: true };
      }

      await transaction.$queryRaw(
        Prisma.sql`SELECT "id" FROM "pos_sessions" WHERE "id" = ${input.posSessionId}::uuid AND "organization_id" = ${tenant.organizationId}::uuid FOR UPDATE`,
      );
      const session = await transaction.posSession.findFirst({
        where: {
          id: input.posSessionId,
          organizationId: tenant.organizationId,
          branchId: { in: [...tenant.branchIds] },
          status: 'OPEN',
        },
        include: { company: true },
      });
      if (!session) throw salesNotFound();
      const now = new Date();
      const financialYear = financialYearFor(
        now,
        session.company.financialYearFrom,
      );
      const series = await transaction.invoiceSeries.findFirst({
        where: {
          organizationId: tenant.organizationId,
          companyId: session.companyId,
          documentType: 'SALES_INVOICE',
          financialYear,
          active: true,
        },
        orderBy: { createdAt: 'asc' },
      });
      if (!series) {
        throw new ConflictException({
          code: 'SALES_INVOICE_SERIES_REQUIRED',
          message:
            'No active sales invoice series exists for this financial year.',
        });
      }
      await transaction.$queryRaw(
        Prisma.sql`SELECT "id" FROM "invoice_series" WHERE "id" = ${series.id}::uuid AND "organization_id" = ${tenant.organizationId}::uuid FOR UPDATE`,
      );
      const lockedSeries = await transaction.invoiceSeries.findUniqueOrThrow({
        where: { id: series.id },
      });
      const [variants, customer] = await Promise.all([
        transaction.productVariant.findMany({
          where: {
            id: { in: [...uniqueVariantIds] },
            organizationId: tenant.organizationId,
            active: true,
            product: { active: true },
          },
          include: { product: { include: { defaultTaxRate: true } } },
        }),
        input.customerId
          ? transaction.customer.findFirst({
              where: {
                id: input.customerId,
                organizationId: tenant.organizationId,
                active: true,
              },
            })
          : Promise.resolve(null),
      ]);
      if (
        variants.length !== uniqueVariantIds.size ||
        (input.customerId && !customer)
      )
        throw salesNotFound();
      const variantMap = new Map(
        variants.map((variant) => [variant.id, variant]),
      );
      const balanceMap = new Map<
        string,
        { quantity: Prisma.Decimal; averageCost: Prisma.Decimal }
      >();
      for (const variant of variants
        .filter(({ trackInventory }) => trackInventory)
        .sort((left, right) => left.id.localeCompare(right.id))) {
        await transaction.$queryRaw(
          Prisma.sql`SELECT "quantity" FROM "stock_balances" WHERE "organization_id" = ${tenant.organizationId}::uuid AND "warehouse_id" = ${session.warehouseId}::uuid AND "variant_id" = ${variant.id}::uuid FOR UPDATE`,
        );
        const balance = await transaction.stockBalance.findUnique({
          where: {
            organizationId_warehouseId_variantId: {
              organizationId: tenant.organizationId,
              warehouseId: session.warehouseId,
              variantId: variant.id,
            },
          },
        });
        if (!balance) throw insufficientStock();
        balanceMap.set(variant.id, balance);
      }
      const lines = input.items.map((item) =>
        calculateSalesLine(
          item,
          variantMap.get(item.variantId)!,
          balanceMap.get(item.variantId),
          input.taxTreatment,
        ),
      );
      const totals = salesTotals(lines, money(input.roundOff ?? 0));
      if (
        input.expectedTotal !== undefined &&
        !totals.totalAmount.equals(money(input.expectedTotal))
      ) {
        throw new ConflictException({
          code: 'SALES_TOTAL_MISMATCH',
          message: 'The submitted total does not match the server calculation.',
        });
      }
      const paidAmount = sumDecimals(
        input.payments.map(({ amount }) => money(amount)),
      );
      if (paidAmount.greaterThan(totals.totalAmount)) {
        throw new ConflictException({
          code: 'SALES_PAYMENT_EXCEEDS_TOTAL',
          message: 'Sales payments cannot exceed the invoice total.',
        });
      }
      const outstandingAmount = totals.totalAmount.minus(paidAmount);
      if (outstandingAmount.greaterThan(0) && !customer) {
        throw new ConflictException({
          code: 'CREDIT_CUSTOMER_REQUIRED',
          message:
            'A customer is required when an invoice has an unpaid balance.',
        });
      }
      if (
        customer &&
        customer.creditLimit.greaterThan(0) &&
        customer.receivableBalance
          .plus(outstandingAmount)
          .greaterThan(customer.creditLimit)
      ) {
        throw new ConflictException({
          code: 'CUSTOMER_CREDIT_LIMIT_EXCEEDED',
          message: 'The invoice would exceed the customer credit limit.',
        });
      }
      const displayNumber = `${lockedSeries.prefix}-${String(
        lockedSeries.nextNumber,
      ).padStart(lockedSeries.padding, '0')}`;
      const invoice = await transaction.salesInvoice.create({
        data: {
          organizationId: tenant.organizationId,
          companyId: session.companyId,
          branchId: session.branchId,
          warehouseId: session.warehouseId,
          posSessionId: session.id,
          invoiceSeriesId: lockedSeries.id,
          customerId: customer?.id,
          financialYear,
          seriesPrefix: lockedSeries.prefix,
          invoiceNumber: lockedSeries.nextNumber,
          displayNumber,
          invoiceDate: now,
          taxTreatment: input.taxTreatment,
          placeOfSupplyStateCode: input.placeOfSupplyStateCode,
          grossAmount: totals.grossAmount,
          discountAmount: totals.discountAmount,
          taxableValue: totals.taxableValue,
          cgstAmount: totals.cgstAmount,
          sgstAmount: totals.sgstAmount,
          igstAmount: totals.igstAmount,
          cessAmount: totals.cessAmount,
          roundOff: totals.roundOff,
          totalAmount: totals.totalAmount,
          paidAmount: 0,
          outstandingAmount: totals.totalAmount,
          costAmount: totals.costAmount,
          idempotencyKey,
          requestHash,
          postedByUserId: actorUserId,
        },
      });
      await transaction.salesInvoiceItem.createMany({
        data: lines.map((line) => ({
          organizationId: tenant.organizationId,
          salesInvoiceId: invoice.id,
          variantId: line.variantId,
          description: line.description,
          hsnSac: line.hsnSac,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          grossAmount: line.grossAmount,
          discountAmount: line.discountAmount,
          taxableValue: line.taxableValue,
          taxRate: line.taxRate,
          cgstAmount: line.cgstAmount,
          sgstAmount: line.sgstAmount,
          igstAmount: line.igstAmount,
          cessAmount: line.cessAmount,
          lineTotal: line.lineTotal,
          unitCost: line.unitCost,
          costAmount: line.costAmount,
        })),
      });
      const movements: object[] = [];
      for (const line of lines.filter(({ trackInventory }) => trackInventory)) {
        const balance = balanceMap.get(line.variantId)!;
        if (balance.quantity.lessThan(line.quantity)) throw insufficientStock();
        const movement = await transaction.stockMovement.create({
          data: {
            organizationId: tenant.organizationId,
            companyId: session.companyId,
            branchId: session.branchId,
            warehouseId: session.warehouseId,
            variantId: line.variantId,
            actorUserId,
            movementType: StockMovementType.SALE_ISSUE,
            quantity: line.quantity.negated(),
            unitCost: line.unitCost,
            occurredAt: now,
            sourceType: 'SALES_INVOICE',
            sourceId: invoice.id,
            idempotencyKey,
          },
        });
        await transaction.stockBalance.update({
          where: {
            organizationId_warehouseId_variantId: {
              organizationId: tenant.organizationId,
              warehouseId: session.warehouseId,
              variantId: line.variantId,
            },
          },
          data: { quantity: balance.quantity.minus(line.quantity) },
        });
        movements.push(movement);
      }
      for (const payment of input.payments) {
        await transaction.salesPayment.create({
          data: {
            organizationId: tenant.organizationId,
            companyId: session.companyId,
            branchId: session.branchId,
            posSessionId: session.id,
            salesInvoiceId: invoice.id,
            actorUserId,
            method: payment.method,
            amount: money(payment.amount),
            reference: payment.reference?.trim(),
            receivedAt: now,
          },
        });
      }
      await transaction.salesInvoice.update({
        where: { id: invoice.id },
        data: { paidAmount, outstandingAmount },
      });
      if (customer && outstandingAmount.greaterThan(0)) {
        await transaction.customer.update({
          where: { id: customer.id },
          data: {
            receivableBalance:
              customer.receivableBalance.plus(outstandingAmount),
          },
        });
      }
      const cashAmount = sumDecimals(
        input.payments
          .filter(({ method }) => method === PaymentMethod.CASH)
          .map(({ amount }) => money(amount)),
      );
      if (cashAmount.greaterThan(0)) {
        await transaction.posSession.update({
          where: { id: session.id },
          data: { cashSalesAmount: session.cashSalesAmount.plus(cashAmount) },
        });
      }
      await transaction.invoiceSeries.update({
        where: { id: lockedSeries.id },
        data: { nextNumber: { increment: 1 } },
      });
      await transaction.auditLog.create({
        data: {
          organizationId: tenant.organizationId,
          actorUserId,
          action: 'SALES_INVOICE_POSTED',
          targetType: 'SALES_INVOICE',
          targetId: invoice.id,
          correlationId,
          outcome: 'SUCCESS',
          summary: {
            displayNumber,
            totalAmount: totals.totalAmount.toString(),
            paidAmount: paidAmount.toString(),
            outstandingAmount: outstandingAmount.toString(),
            stockMovements: movements.length,
          },
        },
      });
      const created = await transaction.salesInvoice.findUniqueOrThrow({
        where: { id: invoice.id },
        include: { customer: true, items: true, payments: true },
      });
      return { invoice: created, movements, idempotent: false };
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
    throw new Error('Serializable sales transaction retry loop exhausted.');
  }
}

function calculateSalesLine(
  input: PostSalesInvoiceItemDto,
  variant: {
    id: string;
    name: string | null;
    salePrice: Prisma.Decimal;
    trackInventory: boolean;
    product: {
      name: string;
      hsnSac: string | null;
      priceTaxMode: PriceTaxMode;
      defaultTaxRate: { rate: Prisma.Decimal; cessRate: Prisma.Decimal } | null;
    };
  },
  balance:
    { quantity: Prisma.Decimal; averageCost: Prisma.Decimal } | undefined,
  taxTreatment: TaxTreatment,
): SalesLine {
  const quantity = new Prisma.Decimal(input.quantity);
  if (
    variant.trackInventory &&
    (!balance || balance.quantity.lessThan(quantity))
  )
    throw insufficientStock();
  const unitPrice = variant.salePrice;
  const grossAmount = quantity
    .mul(unitPrice)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  const discountAmount = money(input.discountAmount ?? 0);
  if (discountAmount.greaterThan(grossAmount)) {
    throw new ConflictException({
      code: 'INVALID_SALES_DISCOUNT',
      message: 'A line discount cannot exceed the line value.',
    });
  }
  const net = grossAmount.minus(discountAmount);
  const taxRate = variant.product.defaultTaxRate?.rate ?? new Prisma.Decimal(0);
  const cessRate =
    variant.product.defaultTaxRate?.cessRate ?? new Prisma.Decimal(0);
  const inclusive = variant.product.priceTaxMode === PriceTaxMode.INCLUSIVE;
  const taxableValue = inclusive
    ? net
        .mul(100)
        .div(new Prisma.Decimal(100).plus(taxRate).plus(cessRate))
        .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
    : net;
  const tax = taxableValue
    .mul(taxRate)
    .div(100)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  const cessAmount = inclusive
    ? net.minus(taxableValue).minus(tax)
    : taxableValue
        .mul(cessRate)
        .div(100)
        .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  const cgstAmount =
    taxTreatment === TaxTreatment.INTRASTATE
      ? tax.div(2).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
      : new Prisma.Decimal(0);
  const sgstAmount =
    taxTreatment === TaxTreatment.INTRASTATE
      ? tax.minus(cgstAmount)
      : new Prisma.Decimal(0);
  const igstAmount =
    taxTreatment === TaxTreatment.INTERSTATE ? tax : new Prisma.Decimal(0);
  const unitCost = balance?.averageCost ?? new Prisma.Decimal(0);
  return {
    variantId: variant.id,
    description: variant.name
      ? `${variant.product.name} · ${variant.name}`
      : variant.product.name,
    hsnSac: variant.product.hsnSac ?? undefined,
    quantity,
    unitPrice,
    grossAmount,
    discountAmount,
    taxableValue,
    taxRate,
    cgstAmount,
    sgstAmount,
    igstAmount,
    cessAmount,
    lineTotal: taxableValue
      .plus(cgstAmount)
      .plus(sgstAmount)
      .plus(igstAmount)
      .plus(cessAmount),
    unitCost,
    costAmount: quantity
      .mul(unitCost)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
    trackInventory: variant.trackInventory,
  };
}

function salesTotals(lines: SalesLine[], roundOff: Prisma.Decimal) {
  const sum = (select: (line: SalesLine) => Prisma.Decimal) =>
    sumDecimals(lines.map(select));
  const grossAmount = sum(({ grossAmount }) => grossAmount);
  const discountAmount = sum(({ discountAmount }) => discountAmount);
  const taxableValue = sum(({ taxableValue }) => taxableValue);
  const cgstAmount = sum(({ cgstAmount }) => cgstAmount);
  const sgstAmount = sum(({ sgstAmount }) => sgstAmount);
  const igstAmount = sum(({ igstAmount }) => igstAmount);
  const cessAmount = sum(({ cessAmount }) => cessAmount);
  return {
    grossAmount,
    discountAmount,
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
    costAmount: sum(({ costAmount }) => costAmount),
  };
}

function hashRequest(input: PostSalesInvoiceDto): string {
  const normalized = {
    ...input,
    items: [...input.items].sort((a, b) =>
      a.variantId.localeCompare(b.variantId),
    ),
    payments: [...input.payments].sort((a, b) =>
      `${a.method}:${a.reference ?? ''}:${a.amount}`.localeCompare(
        `${b.method}:${b.reference ?? ''}:${b.amount}`,
      ),
    ),
  };
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

function financialYearFor(date: Date, firstMonth: number): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const start = month >= firstMonth ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

function sumDecimals(values: Array<Prisma.Decimal | number>): Prisma.Decimal {
  return values.reduce<Prisma.Decimal>(
    (total, value) => total.plus(value),
    new Prisma.Decimal(0),
  );
}

function money(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value).toDecimalPlaces(
    2,
    Prisma.Decimal.ROUND_HALF_UP,
  );
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '-');
}

function validateIdempotencyKey(value: string): void {
  if (!value?.trim() || value.length > 120) {
    throw new ConflictException({
      code: 'IDEMPOTENCY_KEY_REQUIRED',
      message: 'A valid Idempotency-Key header is required.',
    });
  }
}

function salesNotFound(): NotFoundException {
  return new NotFoundException({
    code: 'SALES_RESOURCE_NOT_FOUND',
    message: 'The requested sales resource was not found.',
  });
}

function insufficientStock(): ConflictException {
  return new ConflictException({
    code: 'INSUFFICIENT_STOCK',
    message: 'This sale would make stock negative.',
  });
}

function idempotencyConflict(): ConflictException {
  return new ConflictException({
    code: 'IDEMPOTENCY_KEY_CONFLICT',
    message: 'This idempotency key was already used for another request.',
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
