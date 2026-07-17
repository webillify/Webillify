import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

describe('Sales and POS database foundation', () => {
  const prisma = new PrismaClient();
  const organizationId = '20000000-0000-4000-8000-000000000001';
  const companyId = '30000000-0000-4000-8000-000000000001';
  const branchId = '40000000-0000-4000-8000-000000000001';
  const warehouseId = 'c0000000-0000-4000-8000-000000000001';
  const userId = '10000000-0000-4000-8000-000000000001';
  const customerId = 'f2000000-0000-4000-8000-000000000001';
  const invoiceSeriesId = 'f3000000-0000-4000-8000-000000000001';
  const variantId = 'a0000000-0000-4000-8000-000000000001';

  beforeAll(async () => prisma.$connect());
  afterAll(async () => prisma.$disconnect());

  it('loads deterministic customer and financial-year invoice-series fixtures', async () => {
    const [customer, series] = await Promise.all([
      prisma.customer.findUniqueOrThrow({ where: { id: customerId } }),
      prisma.invoiceSeries.findUniqueOrThrow({
        where: { id: invoiceSeriesId },
      }),
    ]);

    expect(customer).toMatchObject({
      organizationId,
      normalizedCode: 'DEMO-CUSTOMER',
      name: 'Demo Credit Customer',
      active: true,
    });
    expect(customer.creditLimit.toString()).toBe('25000');
    expect(series).toMatchObject({
      organizationId,
      companyId,
      documentType: 'SALES_INVOICE',
      financialYear: '2026-27',
      prefix: 'WBL',
      nextNumber: 1,
      padding: 5,
      active: true,
    });
  });

  it('enforces one open register and matching company/branch/warehouse ownership', async () => {
    const registerCode = `REGISTER-${randomUUID()}`;
    const session = await createSession(registerCode);
    try {
      await expect(createSession(registerCode)).rejects.toThrow();
      const otherCompany = await prisma.company.create({
        data: {
          organizationId,
          legalName: 'POS Ownership Test Company',
          normalizedCode: `POS-${randomUUID()}`,
        },
      });
      try {
        await expect(
          prisma.posSession.create({
            data: {
              organizationId,
              companyId: otherCompany.id,
              branchId,
              warehouseId,
              openedByUserId: userId,
              registerCode: `MISMATCH-${randomUUID()}`,
            },
          }),
        ).rejects.toThrow(/ownership must match/);
      } finally {
        await prisma.company.delete({ where: { id: otherCompany.id } });
      }
    } finally {
      await prisma.posSession.delete({ where: { id: session.id } });
    }
  });

  it('enforces unique server invoice identity, tax treatment and source ownership', async () => {
    const session = await createSession(`INVOICE-${randomUUID()}`);
    const number = randomInvoiceNumber();
    const invoice = await createInvoice(session.id, number);
    await expect(
      createInvoice(session.id, number, {
        idempotencyKey: `duplicate-number-${randomUUID()}`,
        displayNumber: `OTHER-${randomUUID()}`,
      }),
    ).rejects.toThrow();
    await expect(
      createInvoice(session.id, randomInvoiceNumber(), {
        idempotencyKey: `invalid-tax-${randomUUID()}`,
        displayNumber: `INVALID-${randomUUID()}`,
        igstAmount: '4.52',
      }),
    ).rejects.toThrow();
    await expect(
      prisma.salesInvoice.update({
        where: { id: invoice.id },
        data: { displayNumber: 'ILLEGAL-RENUMBER' },
      }),
    ).rejects.toThrow(/posted sales invoices are immutable/);
  });

  it('reconciles split payments and keeps invoice items and tenders append-only', async () => {
    const session = await createSession(`PAYMENT-${randomUUID()}`);
    const invoice = await createInvoice(session.id, randomInvoiceNumber());
    const item = await prisma.salesInvoiceItem.create({
      data: {
        organizationId,
        salesInvoiceId: invoice.id,
        variantId,
        description: 'Premium Rice 1 kg',
        hsnSac: '1006',
        quantity: '1.000',
        unitPrice: '90.4800',
        grossAmount: '90.48',
        taxableValue: '90.48',
        taxRate: '5.00',
        cgstAmount: '2.26',
        sgstAmount: '2.26',
        lineTotal: '95.00',
        unitCost: '45.0000',
        costAmount: '45.00',
      },
    });
    const cash = await createPayment(invoice.id, session.id, 'CASH', '50.00');
    const upi = await createPayment(invoice.id, session.id, 'UPI', '45.00');
    const reconciled = await prisma.salesInvoice.update({
      where: { id: invoice.id },
      data: { paidAmount: '95.00', outstandingAmount: '0.00' },
    });
    expect(reconciled.paidAmount.toString()).toBe('95');
    expect(reconciled.outstandingAmount.toString()).toBe('0');
    await expect(
      createPayment(invoice.id, session.id, 'CARD', '0.01'),
    ).rejects.toThrow(/ownership or amount is invalid/);
    await expect(
      prisma.salesInvoiceItem.update({
        where: { id: item.id },
        data: { quantity: '2.000' },
      }),
    ).rejects.toThrow(/append-only/);
    await expect(
      prisma.salesPayment.update({
        where: { id: cash.id },
        data: { amount: '49.00' },
      }),
    ).rejects.toThrow(/append-only/);
    expect(upi.method).toBe('UPI');
  });

  it('keeps cash movements append-only and enforces audited closing values', async () => {
    const session = await createSession(`CASH-${randomUUID()}`);
    const movement = await prisma.cashMovement.create({
      data: {
        organizationId,
        companyId,
        branchId,
        posSessionId: session.id,
        actorUserId: userId,
        movementType: 'PAY_IN',
        amount: '100.00',
        reason: 'Add reviewed cash float during the shift',
        idempotencyKey: `cash-${randomUUID()}`,
        occurredAt: new Date(),
      },
    });
    await prisma.posSession.update({
      where: { id: session.id },
      data: {
        payInAmount: '100.00',
        status: 'CLOSED',
        expectedCash: '100.00',
        declaredCash: '98.00',
        variance: '-2.00',
        closedAt: new Date(),
        closedByUserId: userId,
      },
    });
    await expect(
      prisma.cashMovement.update({
        where: { id: movement.id },
        data: { reason: 'Illegal cash movement rewrite' },
      }),
    ).rejects.toThrow(/append-only/);
    await expect(
      prisma.cashMovement.create({
        data: {
          organizationId,
          companyId,
          branchId,
          posSessionId: session.id,
          actorUserId: userId,
          movementType: 'PAY_OUT',
          amount: '1.00',
          reason: 'Movement after the session was closed',
          idempotencyKey: `closed-cash-${randomUUID()}`,
          occurredAt: new Date(),
        },
      }),
    ).rejects.toThrow(/open matching POS session/);
  });

  function createSession(registerCode: string) {
    return prisma.posSession.create({
      data: {
        organizationId,
        companyId,
        branchId,
        warehouseId,
        openedByUserId: userId,
        registerCode,
        openingCash: '0.00',
      },
    });
  }

  function createInvoice(
    posSessionId: string,
    invoiceNumber: number,
    overrides: Partial<{
      idempotencyKey: string;
      displayNumber: string;
      igstAmount: string;
    }> = {},
  ) {
    return prisma.salesInvoice.create({
      data: {
        organizationId,
        companyId,
        branchId,
        warehouseId,
        posSessionId,
        invoiceSeriesId,
        customerId,
        financialYear: '2026-27',
        seriesPrefix: 'WBL',
        invoiceNumber,
        displayNumber:
          overrides.displayNumber ??
          `WBL-${String(invoiceNumber).padStart(5, '0')}`,
        invoiceDate: new Date(),
        taxTreatment: 'INTRASTATE',
        placeOfSupplyStateCode: '33',
        grossAmount: '90.48',
        taxableValue: '90.48',
        cgstAmount: '2.26',
        sgstAmount: '2.26',
        igstAmount: overrides.igstAmount ?? '0.00',
        totalAmount: '95.00',
        outstandingAmount: '95.00',
        costAmount: '45.00',
        idempotencyKey: overrides.idempotencyKey ?? `invoice-${randomUUID()}`,
        postedByUserId: userId,
      },
    });
  }

  function createPayment(
    salesInvoiceId: string,
    posSessionId: string,
    method: 'CASH' | 'UPI' | 'CARD',
    amount: string,
  ) {
    return prisma.salesPayment.create({
      data: {
        organizationId,
        companyId,
        branchId,
        posSessionId,
        salesInvoiceId,
        actorUserId: userId,
        method,
        amount,
        receivedAt: new Date(),
      },
    });
  }

  function randomInvoiceNumber(): number {
    return Number.parseInt(randomUUID().replaceAll('-', '').slice(0, 7), 16);
  }
});
