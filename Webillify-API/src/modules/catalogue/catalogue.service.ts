import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CoreEntitlementService } from '../subscriptions/core-entitlement.service';
import type { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class CatalogueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEntitlementService,
  ) {}

  listProducts(organizationId: string): Promise<object[]> {
    return this.prisma.product.findMany({
      where: { organizationId, active: true },
      include: {
        category: { select: { id: true, name: true } },
        baseUnit: { select: { id: true, code: true, symbol: true } },
        defaultTaxRate: { select: { id: true, code: true, rate: true } },
        variants: {
          where: { active: true },
          include: { barcodes: true },
          orderBy: { sku: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getProduct(organizationId: string, id: string): Promise<object> {
    const product = await this.prisma.product.findFirst({
      where: { id, organizationId },
      include: {
        category: true,
        baseUnit: true,
        defaultTaxRate: true,
        variants: { include: { barcodes: true } },
      },
    });
    if (!product) throw catalogueNotFound();
    return product;
  }

  async createProduct(
    organizationId: string,
    input: CreateProductDto,
  ): Promise<object> {
    await this.core.assertMutationAllowed(organizationId);
    try {
      return await this.prisma.$transaction(async (transaction) => {
        await validateReferences(transaction, organizationId, input);
        const product = await transaction.product.create({
          data: {
            organizationId,
            categoryId: input.categoryId,
            baseUnitId: input.baseUnitId,
            defaultTaxRateId: input.taxRateId,
            normalizedCode: normalizeCode(input.code),
            name: input.name.trim(),
            productType: input.productType,
            hsnSac: input.hsnSac?.trim(),
            priceTaxMode: input.priceTaxMode,
          },
        });
        const variant = await transaction.productVariant.create({
          data: {
            organizationId,
            productId: product.id,
            sku: normalizeCode(input.sku),
            name: input.variantName?.trim(),
            salePrice: input.salePrice,
            purchaseCost: input.purchaseCost ?? 0,
            trackInventory: input.trackInventory ?? true,
          },
        });
        if (input.barcode)
          await transaction.productBarcode.create({
            data: {
              organizationId,
              variantId: variant.id,
              barcode: input.barcode.trim(),
              primary: true,
            },
          });
        return transaction.product.findUniqueOrThrow({
          where: { id: product.id },
          include: { variants: { include: { barcodes: true } } },
        });
      });
    } catch (error) {
      if (isUniqueConflict(error))
        throw new ConflictException({
          code: 'CATALOGUE_IDENTIFIER_CONFLICT',
          message: 'The product code, SKU, or barcode already exists.',
        });
      throw error;
    }
  }

  listCategories(organizationId: string): Promise<object[]> {
    return this.prisma.category.findMany({
      where: { organizationId, active: true },
      orderBy: { name: 'asc' },
    });
  }

  listUnits(organizationId: string): Promise<object[]> {
    return this.prisma.unit.findMany({
      where: { organizationId, active: true },
      orderBy: { name: 'asc' },
    });
  }

  listTaxRates(organizationId: string): Promise<object[]> {
    return this.prisma.taxRate.findMany({
      where: { organizationId, active: true },
      orderBy: [{ code: 'asc' }, { effectiveFrom: 'desc' }],
    });
  }
}

async function validateReferences(
  transaction: Prisma.TransactionClient,
  organizationId: string,
  input: CreateProductDto,
): Promise<void> {
  const [unit, category, taxRate] = await Promise.all([
    transaction.unit.findFirst({
      where: { id: input.baseUnitId, organizationId, active: true },
    }),
    input.categoryId
      ? transaction.category.findFirst({
          where: { id: input.categoryId, organizationId, active: true },
        })
      : true,
    input.taxRateId
      ? transaction.taxRate.findFirst({
          where: { id: input.taxRateId, organizationId, active: true },
        })
      : true,
  ]);
  if (!unit || !category || !taxRate) throw catalogueNotFound();
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '-');
}

function catalogueNotFound(): NotFoundException {
  return new NotFoundException({
    code: 'CATALOGUE_REFERENCE_NOT_FOUND',
    message: 'The requested catalogue resource was not found.',
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
