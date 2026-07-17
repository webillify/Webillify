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

interface SupplierBody {
  id: string;
}

interface PurchaseBillBody {
  id: string;
  status: string;
  taxableValue: string;
  cgstAmount: string;
  sgstAmount: string;
  totalAmount: string;
  paidAmount: string;
  outstandingAmount: string;
  items: Array<{ id: string }>;
}

interface PostedPurchaseBody {
  bill: PurchaseBillBody;
  movements: Array<{ id: string }>;
  idempotent: boolean;
}

interface SupplierPaymentBody {
  payment: { id: string; allocations: Array<{ purchaseBillId: string }> };
  idempotent: boolean;
}

describe('Protected purchases and payables APIs', () => {
  const prisma = new PrismaClient();
  const organizationId = '20000000-0000-4000-8000-000000000001';
  const supplierId = 'e0000000-0000-4000-8000-000000000001';
  let app: INestApplication;
  let server: Parameters<typeof request>[0];
  let ownerToken: string;
  let cashierToken: string;
  let branchId: string;
  let warehouseId: string;
  let variantId: string;
  let postedBillId: string;

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
    branchId = warehouse.branchId;
    warehouseId = warehouse.id;
    variantId = (
      await prisma.productVariant.findFirstOrThrow({
        where: { organizationId, sku: 'RICE-PREMIUM-1KG' },
      })
    ).id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('lists branch-scoped purchase data and denies a cashier without purchase access', async () => {
    const suppliers = await tenantGet('/api/v1/suppliers', ownerToken, 200);
    expect(suppliers.body as unknown as object[]).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: supplierId })]),
    );
    const bills = await tenantGet('/api/v1/purchase-bills', ownerToken, 200);
    expect(bills.body as unknown as object[]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ supplierInvoiceReference: 'DEMO-INV-001' }),
      ]),
    );
    await tenantGet('/api/v1/suppliers', cashierToken, 403);
    await tenantPost('/api/v1/suppliers', cashierToken)
      .send({ code: `DENIED-${randomUUID()}`, name: 'Denied Supplier' })
      .expect(403);
  });

  it('creates normalized suppliers and rejects duplicate codes', async () => {
    const suffix = randomUUID().slice(0, 8).toUpperCase();
    const response = await tenantPost('/api/v1/suppliers', ownerToken)
      .send({
        code: ` test ${suffix} `,
        name: ` Test Supplier ${suffix} `,
        creditDays: 15,
      })
      .expect(201);
    const supplier = response.body as unknown as SupplierBody;
    try {
      const duplicate = await tenantPost('/api/v1/suppliers', ownerToken)
        .send({ code: `TEST-${suffix}`, name: 'Duplicate Supplier' })
        .expect(409);
      expect((duplicate.body as unknown as ErrorBody).error.code).toBe(
        'SUPPLIER_IDENTIFIER_CONFLICT',
      );
    } finally {
      await prisma.supplier.delete({ where: { id: supplier.id } });
    }
  });

  it('server-calculates an intrastate draft and creates no stock effect', async () => {
    const balanceBefore = await currentBalance();
    const input = purchaseInput(`AUTOMATED-${randomUUID()}`);
    const response = await tenantPost('/api/v1/purchase-bills', ownerToken)
      .send(input)
      .expect(201);
    const bill = response.body as unknown as PurchaseBillBody;
    postedBillId = bill.id;
    expect(bill).toMatchObject({
      status: 'DRAFT',
      taxableValue: '90',
      cgstAmount: '2.25',
      sgstAmount: '2.25',
      totalAmount: '95',
      paidAmount: '0',
      outstandingAmount: '95',
    });
    expect(bill.items).toHaveLength(1);
    const balanceAfter = await currentBalance();
    expect(balanceAfter.quantity.toString()).toBe(
      balanceBefore.quantity.toString(),
    );
    expect(
      await prisma.stockMovement.count({
        where: {
          organizationId,
          sourceType: 'PURCHASE_BILL',
          sourceId: bill.id,
        },
      }),
    ).toBe(0);
  });

  it('blocks duplicate supplier references and client total mismatches', async () => {
    const bill = await prisma.purchaseBill.findUniqueOrThrow({
      where: { id: postedBillId },
    });
    const duplicate = await tenantPost('/api/v1/purchase-bills', ownerToken)
      .send(purchaseInput(` ${bill.supplierInvoiceReference.toLowerCase()} `))
      .expect(409);
    expect((duplicate.body as unknown as ErrorBody).error.code).toBe(
      'PURCHASE_REFERENCE_CONFLICT',
    );
    const mismatch = await tenantPost('/api/v1/purchase-bills', ownerToken)
      .send({ ...purchaseInput(`MISMATCH-${randomUUID()}`), expectedTotal: 94 })
      .expect(409);
    expect((mismatch.body as unknown as ErrorBody).error.code).toBe(
      'PURCHASE_TOTAL_MISMATCH',
    );
  });

  it('posts once under concurrent retries and reconciles the stock ledger', async () => {
    const missing = await tenantPost(
      `/api/v1/purchase-bills/${postedBillId}/post`,
      ownerToken,
    )
      .send()
      .expect(409);
    expect((missing.body as unknown as ErrorBody).error.code).toBe(
      'IDEMPOTENCY_KEY_REQUIRED',
    );

    const before = await currentBalance();
    const key = `purchase-post-${randomUUID()}`;
    const responses = await Promise.all([
      postBill(postedBillId, key),
      postBill(postedBillId, key),
    ]);
    expect(responses.map(({ status }) => status)).toEqual([201, 201]);
    const bodies = responses.map(
      ({ body }) => body as unknown as PostedPurchaseBody,
    );
    expect(bodies.map(({ idempotent }) => idempotent).sort()).toEqual([
      false,
      true,
    ]);
    expect(
      bodies.reduce((count, body) => count + body.movements.length, 0),
    ).toBe(1);

    const movementCount = await prisma.stockMovement.count({
      where: {
        organizationId,
        sourceType: 'PURCHASE_BILL',
        sourceId: postedBillId,
      },
    });
    expect(movementCount).toBe(1);
    const after = await currentBalance();
    expect(after.quantity.toNumber()).toBe(before.quantity.toNumber() + 2);
    const expectedAverage =
      (before.quantity.toNumber() * before.averageCost.toNumber() + 2 * 50) /
      (before.quantity.toNumber() + 2);
    expect(after.averageCost.toNumber()).toBeCloseTo(expectedAverage, 4);

    const changedKey = await postBill(postedBillId, `changed-${randomUUID()}`);
    expect(changedKey.status).toBe(409);
    expect((changedKey.body as unknown as ErrorBody).error.code).toBe(
      'PURCHASE_ALREADY_POSTED',
    );
    await restoreQuantity(before.quantity.toNumber());
  });

  it('posts an idempotent payment and reconciles allocations to the payable projection', async () => {
    const key = `supplier-payment-${randomUUID()}`;
    const input = paymentInput(50);
    const first = await paySupplier(key, input).expect(201);
    expect(first.body as unknown as SupplierPaymentBody).toMatchObject({
      idempotent: false,
    });
    const replay = await paySupplier(key, input).expect(201);
    expect(replay.body as unknown as SupplierPaymentBody).toMatchObject({
      idempotent: true,
    });
    const changed = await paySupplier(key, { ...input, amount: 51 }).expect(
      409,
    );
    expect((changed.body as unknown as ErrorBody).error.code).toBe(
      'IDEMPOTENCY_KEY_CONFLICT',
    );

    const bill = await prisma.purchaseBill.findUniqueOrThrow({
      where: { id: postedBillId },
    });
    expect(bill.paidAmount.toString()).toBe('50');
    expect(bill.outstandingAmount.toString()).toBe('45');
    const allocated = await prisma.supplierPaymentAllocation.aggregate({
      where: { organizationId, purchaseBillId: postedBillId },
      _sum: { amount: true },
    });
    expect(allocated._sum.amount?.toString()).toBe(bill.paidAmount.toString());

    const concurrent = await Promise.all([
      paySupplier(`concurrent-payment-${randomUUID()}`, paymentInput(30)),
      paySupplier(`concurrent-payment-${randomUUID()}`, paymentInput(30)),
    ]);
    expect(concurrent.map(({ status }) => status).sort()).toEqual([201, 409]);
    const afterConcurrent = await prisma.purchaseBill.findUniqueOrThrow({
      where: { id: postedBillId },
    });
    expect(afterConcurrent.paidAmount.toString()).toBe('80');
    expect(afterConcurrent.outstandingAmount.toString()).toBe('15');

    const overallocated = await paySupplier(
      `overpay-${randomUUID()}`,
      paymentInput(16),
    ).expect(409);
    expect((overallocated.body as unknown as ErrorBody).error.code).toBe(
      'PAYMENT_ALLOCATION_EXCEEDS_BALANCE',
    );
  });

  it('hides unassigned branches and other tenant contexts', async () => {
    const company = await prisma.company.findFirstOrThrow({
      where: { organizationId },
    });
    const otherBranch = await prisma.branch.create({
      data: {
        organizationId,
        companyId: company.id,
        name: 'Unassigned Purchase Branch',
        normalizedCode: `UNASSIGNED-${randomUUID().slice(0, 8)}`,
      },
    });
    const otherWarehouse = await prisma.warehouse.create({
      data: {
        organizationId,
        companyId: company.id,
        branchId: otherBranch.id,
        normalizedCode: `UNASSIGNED-${randomUUID().slice(0, 8)}`,
        name: 'Unassigned Purchase Warehouse',
      },
    });
    try {
      const hidden = await tenantPost('/api/v1/purchase-bills', ownerToken)
        .send({
          ...purchaseInput(`BRANCH-${randomUUID()}`),
          branchId: otherBranch.id,
          warehouseId: otherWarehouse.id,
        })
        .expect(404);
      expect((hidden.body as unknown as ErrorBody).error.code).toBe(
        'PURCHASE_RESOURCE_NOT_FOUND',
      );
      await request(server)
        .get('/api/v1/purchase-bills')
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('X-Organization-Id', randomUUID())
        .expect(404);
    } finally {
      await prisma.warehouse.delete({ where: { id: otherWarehouse.id } });
      await prisma.branch.delete({ where: { id: otherBranch.id } });
    }
  });

  it('rejects direct mutation of posted snapshots and unreconciled payment projections', async () => {
    await expect(
      prisma.purchaseBill.update({
        where: { id: postedBillId },
        data: { supplierInvoiceReference: 'ILLEGAL-MUTATION' },
      }),
    ).rejects.toThrow(/posted purchase bills are immutable/);
    await expect(
      prisma.purchaseBill.update({
        where: { id: postedBillId },
        data: { paidAmount: 81, outstandingAmount: 14 },
      }),
    ).rejects.toThrow(/reconcile to posted allocations/);
  });

  it('blocks purchase mutations while the core subscription is suspended', async () => {
    await prisma.subscription.update({
      where: { organizationId },
      data: { status: SubscriptionStatus.SUSPENDED },
    });
    try {
      const response = await tenantPost('/api/v1/purchase-bills', ownerToken)
        .send(purchaseInput(`SUSPENDED-${randomUUID()}`))
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

  function purchaseInput(reference: string) {
    return {
      branchId,
      warehouseId,
      supplierId,
      supplierInvoiceReference: reference,
      invoiceDate: '2026-07-17',
      dueDate: '2026-08-16',
      taxTreatment: 'INTRASTATE',
      inputTaxEligible: true,
      roundOff: 0.5,
      expectedTotal: 95,
      items: [
        {
          variantId,
          quantity: 2,
          unitCost: 50,
          discountAmount: 10,
          taxRate: 5,
        },
      ],
    };
  }

  function paymentInput(allocationAmount: number) {
    return {
      branchId,
      supplierId,
      method: 'BANK',
      amount: allocationAmount,
      reference: 'AUTOMATED-PAYMENT',
      paidAt: '2026-07-17T12:00:00.000Z',
      allocations: [{ purchaseBillId: postedBillId, amount: allocationAmount }],
    };
  }

  async function restoreQuantity(target: number): Promise<void> {
    const balance = await currentBalance();
    const difference = balance.quantity.toNumber() - target;
    if (difference === 0) return;
    await tenantPost('/api/v1/stock-adjustments', ownerToken)
      .set('Idempotency-Key', `purchase-restore-${randomUUID()}`)
      .send({
        warehouseId,
        variantId,
        movementType: difference > 0 ? 'ADJUSTMENT_OUT' : 'ADJUSTMENT_IN',
        quantity: Math.abs(difference),
        unitCost: balance.averageCost.toNumber(),
        sourceId: randomUUID(),
        reason: 'Restore stock after purchase API integration test',
      })
      .expect(201);
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

  function postBill(id: string, key: string) {
    return tenantPost(`/api/v1/purchase-bills/${id}/post`, ownerToken)
      .set('Idempotency-Key', key)
      .send();
  }

  function paySupplier(key: string, input: object) {
    return tenantPost('/api/v1/supplier-payments', ownerToken)
      .set('Idempotency-Key', key)
      .send(input);
  }
});
