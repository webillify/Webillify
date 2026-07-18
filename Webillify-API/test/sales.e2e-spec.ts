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

interface SessionBody {
  session: { id: string; registerCode: string; openingCash: string };
  idempotent: boolean;
}

interface InvoiceBody {
  invoice: {
    id: string;
    displayNumber: string;
    taxableValue: string;
    cgstAmount: string;
    sgstAmount: string;
    totalAmount: string;
    paidAmount: string;
    outstandingAmount: string;
    items: Array<{ id: string }>;
    payments: Array<{ id: string }>;
  };
  movements: Array<{ id: string }>;
  idempotent: boolean;
}

describe('Protected POS sessions and sales invoice APIs', () => {
  const prisma = new PrismaClient();
  const organizationId = '20000000-0000-4000-8000-000000000001';
  const customerId = 'f2000000-0000-4000-8000-000000000001';
  let app: INestApplication;
  let server: Parameters<typeof request>[0];
  let ownerToken: string;
  let cashierToken: string;
  let branchId: string;
  let warehouseId: string;
  let variantId: string;
  let posSessionId: string;

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

  it('opens one cashier session under concurrent retries and scopes listings', async () => {
    const missingKey = await tenantPost(
      '/api/v1/pos-sessions/open',
      cashierToken,
    )
      .send(sessionInput(`MISSING-${randomUUID()}`))
      .expect(409);
    expect((missingKey.body as unknown as ErrorBody).error.code).toBe(
      'IDEMPOTENCY_KEY_REQUIRED',
    );

    const key = `pos-open-${randomUUID()}`;
    const registerCode = ` register ${randomUUID().slice(0, 8)} `;
    const input = sessionInput(registerCode);
    const responses = await Promise.all([
      openSession(key, input),
      openSession(key, input),
    ]);
    expect(responses.map(({ status }) => status)).toEqual([201, 201]);
    const bodies = responses.map(({ body }) => body as unknown as SessionBody);
    expect(bodies.map(({ idempotent }) => idempotent).sort()).toEqual([
      false,
      true,
    ]);
    expect(new Set(bodies.map(({ session }) => session.id)).size).toBe(1);
    posSessionId = bodies[0].session.id;
    expect(bodies[0].session).toMatchObject({
      registerCode: registerCode.trim().toUpperCase().replace(/\s+/g, '-'),
      openingCash: '250',
    });

    const listed = await tenantGet('/api/v1/pos-sessions', cashierToken, 200);
    expect(listed.body as unknown as object[]).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: posSessionId })]),
    );
    expect(
      await prisma.auditLog.count({
        where: {
          organizationId,
          action: 'POS_SESSION_OPENED',
          targetId: posSessionId,
        },
      }),
    ).toBe(1);
  });

  it('rejects changed session replays and a second open session for one register', async () => {
    const key = `pos-open-conflict-${randomUUID()}`;
    const input = sessionInput(`CONFLICT-${randomUUID()}`);
    await openSession(key, input).then((response) =>
      expect(response.status).toBe(201),
    );
    const changed = await openSession(key, { ...input, openingCash: 251 });
    expect(changed.status).toBe(409);
    expect((changed.body as unknown as ErrorBody).error.code).toBe(
      'IDEMPOTENCY_KEY_CONFLICT',
    );
    const duplicateRegister = await openSession(
      `pos-open-${randomUUID()}`,
      input,
    );
    expect(duplicateRegister.status).toBe(409);
    expect((duplicateRegister.body as unknown as ErrorBody).error.code).toBe(
      'POS_SESSION_ALREADY_OPEN',
    );
  });

  it('posts a server-priced GST sale once under concurrent retries', async () => {
    const before = await currentBalance();
    const seriesBefore = await currentSeries();
    const key = `sales-post-${randomUUID()}`;
    const input = invoiceInput();
    try {
      const responses = await Promise.all([
        postInvoice(key, input),
        postInvoice(key, input),
      ]);
      expect(responses.map(({ status }) => status)).toEqual([201, 201]);
      const bodies = responses.map(
        ({ body }) => body as unknown as InvoiceBody,
      );
      expect(bodies.map(({ idempotent }) => idempotent).sort()).toEqual([
        false,
        true,
      ]);
      const created = bodies.find(({ idempotent }) => !idempotent)!;
      expect(created.invoice).toMatchObject({
        displayNumber: `WBL-${String(seriesBefore.nextNumber).padStart(5, '0')}`,
        taxableValue: '60',
        cgstAmount: '1.5',
        sgstAmount: '1.5',
        totalAmount: '63',
        paidAmount: '63',
        outstandingAmount: '0',
      });
      expect(created.invoice.items).toHaveLength(1);
      expect(created.invoice.payments).toHaveLength(1);
      expect(created.movements).toHaveLength(1);
      expect(
        bodies.reduce((count, body) => count + body.movements.length, 0),
      ).toBe(1);
      expect((await currentBalance()).quantity.toNumber()).toBe(
        before.quantity.toNumber() - 1,
      );
      expect((await currentSeries()).nextNumber).toBe(
        seriesBefore.nextNumber + 1,
      );
      const storedSession = await prisma.posSession.findUniqueOrThrow({
        where: { id: posSessionId },
      });
      expect(storedSession.cashSalesAmount.toNumber()).toBeGreaterThanOrEqual(
        63,
      );
      expect(
        await prisma.stockMovement.count({
          where: {
            organizationId,
            sourceType: 'SALES_INVOICE',
            sourceId: created.invoice.id,
            movementType: 'SALE_ISSUE',
          },
        }),
      ).toBe(1);
      expect(
        await prisma.auditLog.count({
          where: {
            organizationId,
            action: 'SALES_INVOICE_POSTED',
            targetId: created.invoice.id,
          },
        }),
      ).toBe(1);

      const changed = await postInvoice(key, {
        ...input,
        payments: [{ method: 'UPI', amount: 63, reference: 'changed' }],
      });
      expect(changed.status).toBe(409);
      expect((changed.body as unknown as ErrorBody).error.code).toBe(
        'IDEMPOTENCY_KEY_CONFLICT',
      );
    } finally {
      await restoreQuantity(before.quantity.toNumber());
    }
  });

  it('rejects client total mismatches and stock underflow atomically', async () => {
    const seriesBefore = await currentSeries();
    const invoiceCountBefore = await prisma.salesInvoice.count({
      where: { organizationId },
    });
    const mismatch = await postInvoice(`sales-mismatch-${randomUUID()}`, {
      ...invoiceInput(),
      expectedTotal: 62,
      payments: [{ method: 'CASH', amount: 62 }],
    });
    expect(mismatch.status).toBe(409);
    expect((mismatch.body as unknown as ErrorBody).error.code).toBe(
      'SALES_TOTAL_MISMATCH',
    );

    const balance = await currentBalance();
    const underflow = await postInvoice(`sales-stock-${randomUUID()}`, {
      ...invoiceInput(),
      expectedTotal: undefined,
      items: [{ variantId, quantity: balance.quantity.toNumber() + 1 }],
      payments: [],
    });
    expect(underflow.status).toBe(409);
    expect((underflow.body as unknown as ErrorBody).error.code).toBe(
      'INSUFFICIENT_STOCK',
    );
    expect((await currentSeries()).nextNumber).toBe(seriesBefore.nextNumber);
    expect(await prisma.salesInvoice.count({ where: { organizationId } })).toBe(
      invoiceCountBefore,
    );
  });

  it('requires a customer for credit and updates the receivable projection', async () => {
    const missingCustomer = await postInvoice(`sales-credit-${randomUUID()}`, {
      ...invoiceInput(),
      payments: [{ method: 'UPI', amount: 20, reference: 'UPI-TEST' }],
    });
    expect(missingCustomer.status).toBe(409);
    expect((missingCustomer.body as unknown as ErrorBody).error.code).toBe(
      'CREDIT_CUSTOMER_REQUIRED',
    );

    const balanceBefore = await currentBalance();
    const customerBefore = await prisma.customer.findUniqueOrThrow({
      where: { id: customerId },
    });
    try {
      const response = await postInvoice(`sales-credit-${randomUUID()}`, {
        ...invoiceInput(),
        customerId,
        payments: [{ method: 'UPI', amount: 20, reference: 'UPI-TEST' }],
      });
      expect(response.status).toBe(201);
      const body = response.body as unknown as InvoiceBody;
      expect(body.invoice).toMatchObject({
        paidAmount: '20',
        outstandingAmount: '43',
      });
      const customerAfter = await prisma.customer.findUniqueOrThrow({
        where: { id: customerId },
      });
      expect(customerAfter.receivableBalance.toNumber()).toBe(
        customerBefore.receivableBalance.toNumber() + 43,
      );
    } finally {
      await prisma.customer.update({
        where: { id: customerId },
        data: { receivableBalance: customerBefore.receivableBalance },
      });
      await restoreQuantity(balanceBefore.quantity.toNumber());
    }
  });

  it('lists and retrieves posted invoice details inside the tenant boundary', async () => {
    const response = await tenantGet('/api/v1/sales-invoices', ownerToken, 200);
    const invoices = response.body as unknown as Array<{ id: string }>;
    expect(invoices.length).toBeGreaterThan(0);
    const invoice = await tenantGet(
      `/api/v1/sales-invoices/${invoices[0].id}`,
      cashierToken,
      200,
    );
    expect(invoice.body).toEqual(
      expect.objectContaining({
        id: invoices[0].id,
        items: expect.any(Array) as unknown,
        payments: expect.any(Array) as unknown,
      }),
    );
    await tenantGet(`/api/v1/sales-invoices/${randomUUID()}`, ownerToken, 404);
  });

  it('blocks POS mutations while the core subscription is suspended', async () => {
    await prisma.subscription.update({
      where: { organizationId },
      data: { status: SubscriptionStatus.SUSPENDED },
    });
    try {
      const response = await openSession(
        `pos-suspended-${randomUUID()}`,
        sessionInput(`SUSPENDED-${randomUUID()}`),
      );
      expect(response.status).toBe(402);
      expect((response.body as unknown as ErrorBody).error.code).toBe(
        'CORE_SUBSCRIPTION_INACTIVE',
      );
      const invoice = await postInvoice(
        `sales-suspended-${randomUUID()}`,
        invoiceInput(),
      );
      expect(invoice.status).toBe(402);
      expect((invoice.body as unknown as ErrorBody).error.code).toBe(
        'CORE_SUBSCRIPTION_INACTIVE',
      );
    } finally {
      await prisma.subscription.update({
        where: { organizationId },
        data: { status: SubscriptionStatus.TRIALING },
      });
    }
  });

  function sessionInput(registerCode: string) {
    return {
      branchId,
      warehouseId,
      registerCode,
      openingCash: 250,
    };
  }

  function invoiceInput() {
    return {
      posSessionId,
      taxTreatment: 'INTRASTATE',
      placeOfSupplyStateCode: '33',
      expectedTotal: 63,
      items: [{ variantId, quantity: 1 }],
      payments: [{ method: 'CASH', amount: 63 }],
    };
  }

  async function restoreQuantity(target: number): Promise<void> {
    const balance = await currentBalance();
    const difference = balance.quantity.toNumber() - target;
    if (difference === 0) return;
    await tenantPost('/api/v1/stock-adjustments', ownerToken)
      .set('Idempotency-Key', `sales-restore-${randomUUID()}`)
      .send({
        warehouseId,
        variantId,
        movementType: difference > 0 ? 'ADJUSTMENT_OUT' : 'ADJUSTMENT_IN',
        quantity: Math.abs(difference),
        unitCost: balance.averageCost.toNumber(),
        sourceId: randomUUID(),
        reason: 'Restore stock after sales API integration test',
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

  function currentSeries() {
    return prisma.invoiceSeries.findFirstOrThrow({
      where: {
        organizationId,
        documentType: 'SALES_INVOICE',
        financialYear: '2026-27',
        active: true,
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

  function openSession(key: string, input: object) {
    return tenantPost('/api/v1/pos-sessions/open', cashierToken)
      .set('Idempotency-Key', key)
      .send(input);
  }

  function postInvoice(key: string, input: object) {
    return tenantPost('/api/v1/sales-invoices/post', cashierToken)
      .set('Idempotency-Key', key)
      .send(input);
  }
});
