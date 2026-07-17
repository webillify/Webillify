import { INestApplication } from '@nestjs/common';
import { PrismaClient, SubscriptionStatus } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';

interface LoginBody {
  accessToken: string;
}

interface ErrorBody {
  error: { code: string };
}

interface ProductBody {
  id: string;
  variants: Array<{ id: string; barcodes: Array<{ id: string }> }>;
}

describe('Tenant catalogue and immutable inventory APIs', () => {
  const prisma = new PrismaClient();
  const organizationId = '20000000-0000-4000-8000-000000000001';
  let app: INestApplication;
  let server: Parameters<typeof request>[0];
  let ownerToken: string;
  let cashierToken: string;
  let warehouseId: string;
  let variantId: string;
  let unitId: string;
  let categoryId: string;
  let taxRateId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApplication(app, { swagger: false });
    await app.init();
    server = app.getHttpServer() as Parameters<typeof request>[0];
    await prisma.$connect();
    ownerToken = await login('owner@webillify.demo');
    cashierToken = await login('cashier@webillify.demo');
    const warehouse = await prisma.warehouse.findFirstOrThrow({
      where: { organizationId },
    });
    warehouseId = warehouse.id;
    const variant = await prisma.productVariant.findFirstOrThrow({
      where: { organizationId, sku: 'RICE-PREMIUM-1KG' },
      include: { product: true },
    });
    variantId = variant.id;
    unitId = variant.product.baseUnitId;
    categoryId = variant.product.categoryId!;
    taxRateId = variant.product.defaultTaxRateId!;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('lists tenant products and GST-aware reference data', async () => {
    const products = await tenantGet('/api/v1/products', cashierToken, 200);
    expect(products.body as unknown as object[]).toHaveLength(1);
    for (const path of ['categories', 'units', 'tax-rates']) {
      const response = await tenantGet(`/api/v1/${path}`, ownerToken, 200);
      expect((response.body as unknown as object[]).length).toBeGreaterThan(0);
    }
  });

  it('creates a complete product atomically and rejects duplicate identifiers', async () => {
    const suffix = randomUUID().slice(0, 8).toUpperCase();
    const input = productInput(suffix);
    const created = await tenantPost('/api/v1/products', ownerToken)
      .send(input)
      .expect(201);
    const product = created.body as unknown as ProductBody;
    try {
      expect(product.variants[0].barcodes).toHaveLength(1);
      const duplicate = await tenantPost('/api/v1/products', ownerToken)
        .send({ ...productInput(`${suffix}-OTHER`), sku: input.sku })
        .expect(409);
      expect((duplicate.body as unknown as ErrorBody).error.code).toBe(
        'CATALOGUE_IDENTIFIER_CONFLICT',
      );
    } finally {
      await deleteProduct(product);
    }
  });

  it('denies product mutation without products.manage and hides other tenants', async () => {
    await tenantPost('/api/v1/products', cashierToken)
      .send(productInput(randomUUID().slice(0, 8)))
      .expect(403);
    const response = await request(server)
      .get(`/api/v1/products/${variantId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', randomUUID())
      .expect(404);
    expect((response.body as unknown as ErrorBody).error.code).toBe(
      'ORGANIZATION_NOT_FOUND',
    );
  });

  it('scopes stock reads to assigned branches and inventory permission', async () => {
    const balances = await tenantGet('/api/v1/stock-balances', ownerToken, 200);
    expect(balances.body as unknown as object[]).toHaveLength(1);
    await tenantGet('/api/v1/stock-movements', ownerToken, 200);
    await tenantGet('/api/v1/stock-balances', cashierToken, 403);
  });

  it('posts an adjustment once, detects changed retries, and restores balance', async () => {
    const key = `adjustment-${randomUUID()}`;
    const sourceId = randomUUID();
    const output = adjustment('ADJUSTMENT_OUT', 2, sourceId);
    try {
      const posted = await adjustmentPost(key, output).expect(201);
      expect(posted.body).toMatchObject({
        idempotent: false,
        balance: { quantity: '98' },
      });
      const replay = await adjustmentPost(key, output).expect(201);
      expect(replay.body).toMatchObject({ idempotent: true });
      const conflict = await adjustmentPost(key, {
        ...output,
        quantity: 3,
      }).expect(409);
      expect((conflict.body as unknown as ErrorBody).error.code).toBe(
        'IDEMPOTENCY_KEY_CONFLICT',
      );
    } finally {
      await restoreSeedBalance();
    }
  });

  it('blocks missing idempotency keys and negative stock without ledger writes', async () => {
    const sourceId = randomUUID();
    const missing = await tenantPost('/api/v1/stock-adjustments', ownerToken)
      .send(adjustment('ADJUSTMENT_OUT', 1, sourceId))
      .expect(409);
    expect((missing.body as unknown as ErrorBody).error.code).toBe(
      'IDEMPOTENCY_KEY_REQUIRED',
    );
    const key = `negative-${randomUUID()}`;
    const denied = await adjustmentPost(
      key,
      adjustment('ADJUSTMENT_OUT', 1000, sourceId),
    ).expect(409);
    expect((denied.body as unknown as ErrorBody).error.code).toBe(
      'INSUFFICIENT_STOCK',
    );
    expect(
      await prisma.stockMovement.count({ where: { idempotencyKey: key } }),
    ).toBe(0);
  });

  it('serializes concurrent issues so only one can consume available stock', async () => {
    const requests = [randomUUID(), randomUUID()].map((id) =>
      adjustmentPost(`concurrent-${id}`, adjustment('ADJUSTMENT_OUT', 60, id)),
    );
    try {
      const responses = await Promise.all(requests);
      expect(responses.map(({ status }) => status).sort()).toEqual([201, 409]);
      const denied = responses.find(({ status }) => status === 409)!;
      expect((denied.body as unknown as ErrorBody).error.code).toBe(
        'INSUFFICIENT_STOCK',
      );
    } finally {
      await restoreSeedBalance();
    }
  });

  it('reconciles the mutable projection to the immutable movement ledger', async () => {
    const balance = await currentBalance();
    const movements = await prisma.stockMovement.aggregate({
      where: { organizationId, warehouseId, variantId },
      _sum: { quantity: true },
    });
    expect(balance.quantity.toString()).toBe('100');
    expect(movements._sum.quantity?.toString()).toBe('100');
  });

  it('blocks catalogue and stock mutations when the core plan is suspended', async () => {
    await prisma.subscription.update({
      where: { organizationId },
      data: { status: SubscriptionStatus.SUSPENDED },
    });
    try {
      const response = await tenantPost('/api/v1/products', ownerToken)
        .send(productInput(randomUUID().slice(0, 8)))
        .expect(402);
      expect((response.body as unknown as ErrorBody).error.code).toBe(
        'CORE_SUBSCRIPTION_INACTIVE',
      );
    } finally {
      await prisma.subscription.update({
        where: { organizationId },
        data: { status: SubscriptionStatus.TRIALING },
      });
    }
  });

  function productInput(suffix: string) {
    return {
      code: `TEST-${suffix}`,
      name: `Test Product ${suffix}`,
      categoryId,
      baseUnitId: unitId,
      taxRateId,
      productType: 'GOODS',
      hsnSac: '1006',
      priceTaxMode: 'EXCLUSIVE',
      sku: `TEST-SKU-${suffix}`,
      variantName: 'Default',
      salePrice: 100,
      purchaseCost: 80,
      barcode: `TEST-BARCODE-${suffix}`,
      trackInventory: true,
    };
  }

  function adjustment(
    movementType: 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT',
    quantity: number,
    sourceId: string,
  ) {
    return {
      warehouseId,
      variantId,
      movementType,
      quantity,
      unitCost: 45,
      sourceId,
      reason: 'Automated integration test adjustment',
    };
  }

  async function restoreSeedBalance(): Promise<void> {
    const balance = await currentBalance();
    const quantity = balance.quantity.toNumber();
    if (quantity === 100) return;
    const movementType = quantity < 100 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';
    await adjustmentPost(
      `restore-${randomUUID()}`,
      adjustment(movementType, Math.abs(100 - quantity), randomUUID()),
    ).expect(201);
  }

  function currentBalance() {
    return prisma.stockBalance.findUniqueOrThrow({
      where: {
        organizationId_warehouseId_variantId: {
          organizationId,
          warehouseId,
          variantId,
        },
      },
    });
  }

  async function deleteProduct(product: ProductBody): Promise<void> {
    const variantIds = product.variants.map(({ id }) => id);
    await prisma.productBarcode.deleteMany({
      where: { organizationId, variantId: { in: variantIds } },
    });
    await prisma.productVariant.deleteMany({
      where: { organizationId, id: { in: variantIds } },
    });
    await prisma.product.delete({ where: { id: product.id } });
  }

  async function login(email: string): Promise<string> {
    const response = await request(server)
      .post('/api/v1/auth/login')
      .send({ email, password: 'webillify', remember: false })
      .expect(200);
    return (response.body as unknown as LoginBody).accessToken;
  }

  function tenantGet(path: string, token: string, status: number) {
    return request(server)
      .get(path)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(status);
  }

  function tenantPost(path: string, token: string) {
    return request(server)
      .post(path)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId);
  }

  function adjustmentPost(key: string, input: object) {
    return tenantPost('/api/v1/stock-adjustments', ownerToken)
      .set('Idempotency-Key', key)
      .send(input);
  }
});
