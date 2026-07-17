import { HttpException, INestApplication } from '@nestjs/common';
import { PrismaClient, SubscriptionStatus } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';
import { AiCreditService } from '../src/modules/subscriptions/ai-credit.service';

interface LoginBody {
  accessToken: string;
}

interface ErrorBody {
  error: { code: string };
}

describe('Core and separate Webillify AI entitlements', () => {
  const prisma = new PrismaClient();
  const organizationId = '20000000-0000-4000-8000-000000000001';
  let app: INestApplication;
  let server: Parameters<typeof request>[0];
  let aiCredits: AiCreditService;
  let ownerToken: string;
  let cashierToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApplication(app, { swagger: false });
    await app.init();
    server = app.getHttpServer() as Parameters<typeof request>[0];
    aiCredits = moduleFixture.get(AiCreditService);
    await prisma.$connect();
    ownerToken = await login('owner@webillify.demo');
    cashierToken = await login('cashier@webillify.demo');
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('lists three versioned core plans without bundling the AI add-on', async () => {
    const response = await request(server)
      .get('/api/v1/plans')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const plans = response.body as unknown as Array<{
      code: string;
      entitlements: Record<string, unknown>;
    }>;
    expect(plans).toHaveLength(3);
    expect(plans.map(({ code }) => code)).toEqual([
      'BUSINESS',
      'PRO',
      'STARTER',
    ]);
    expect(plans[0]).not.toHaveProperty('ai');
    expect(plans[0].entitlements['billing.enabled']).toBe(true);
  });

  it('returns core subscription and resource usage independently of AI', async () => {
    const subscription = await tenantGet(
      '/api/v1/subscription',
      ownerToken,
      200,
    );
    const subscriptionBody = subscription.body as unknown as {
      mutationAllowed: boolean;
      subscription: object;
    };
    expect(subscriptionBody).toMatchObject({
      mutationAllowed: true,
      subscription: {
        status: 'TRIALING',
        plan: { code: 'BUSINESS', version: 1 },
        entitlements: { 'branches.max': 3, 'users.max': 10 },
      },
    });
    expect(subscriptionBody.subscription).not.toHaveProperty('aiSubscription');

    const usage = await tenantGet('/api/v1/usage', ownerToken, 200);
    expect((usage.body as unknown as { usage: object }).usage).toEqual({
      companies: 1,
      branches: 1,
      users: 2,
      salesInvoicesThisPeriod: null,
    });
  });

  it('returns a separate AI plan and independent credit balance', async () => {
    const plan = await tenantGet('/api/v1/ai/plan', ownerToken, 200);
    expect(plan.body).toMatchObject({
      code: 'WEBILLIFY_AI',
      separateFromCore: true,
      monthlyPrice: '799.00',
      monthlyCredits: 1500,
      trialCredits: 300,
    });

    const usage = await tenantGet('/api/v1/ai/usage', ownerToken, 200);
    expect(usage.body).toMatchObject({
      subscription: { status: 'TRIALING', monthlyCredits: 300 },
      usable: true,
      availableCredits: 300,
    });
  });

  it('requires both membership and the AI capability permission', async () => {
    const denied = await tenantGet('/api/v1/ai/usage', cashierToken, 403);
    expect((denied.body as unknown as ErrorBody).error.code).toBe(
      'PERMISSION_DENIED',
    );

    const otherTenant = await request(server)
      .get('/api/v1/ai/usage')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Organization-Id', randomUUID())
      .expect(404);
    expect((otherTenant.body as unknown as ErrorBody).error.code).toBe(
      'ORGANIZATION_NOT_FOUND',
    );
  });

  it('keeps core billing usable when the AI subscription is cancelled', async () => {
    await prisma.aiSubscription.update({
      where: { organizationId },
      data: { status: SubscriptionStatus.CANCELLED },
    });
    try {
      const core = await tenantGet('/api/v1/subscription', ownerToken, 200);
      expect(
        (core.body as unknown as { mutationAllowed: boolean }).mutationAllowed,
      ).toBe(true);
      const ai = await tenantGet('/api/v1/ai/usage', ownerToken, 200);
      expect(ai.body).toMatchObject({ usable: false, availableCredits: 300 });
      await expectServiceCode(
        aiCredits.consume(organizationId, 'REPORT_SUMMARY', randomUUID(), 3),
        'AI_SUBSCRIPTION_INACTIVE',
      );
    } finally {
      await prisma.aiSubscription.update({
        where: { organizationId },
        data: { status: SubscriptionStatus.TRIALING },
      });
    }
  });

  it('requires an active core plan before any AI credit consumption', async () => {
    await prisma.subscription.update({
      where: { organizationId },
      data: { status: SubscriptionStatus.SUSPENDED },
    });
    try {
      await expectServiceCode(
        aiCredits.consume(
          organizationId,
          'DOCUMENT_EXTRACTION',
          randomUUID(),
          5,
        ),
        'CORE_SUBSCRIPTION_INACTIVE',
      );
    } finally {
      await prisma.subscription.update({
        where: { organizationId },
        data: { status: SubscriptionStatus.TRIALING },
      });
    }
  });

  it('atomically consumes, deduplicates, rejects conflicts and refunds credits', async () => {
    const referenceId = randomUUID();
    let consumptionId: string | undefined;
    try {
      const charged = await aiCredits.consume(
        organizationId,
        'DOCUMENT_EXTRACTION',
        referenceId,
        5,
      );
      consumptionId = charged.entryId;
      expect(charged).toMatchObject({
        credits: 5,
        availableCredits: 295,
        idempotent: false,
      });

      await expect(
        aiCredits.consume(
          organizationId,
          'DOCUMENT_EXTRACTION',
          referenceId,
          5,
        ),
      ).resolves.toMatchObject({
        entryId: charged.entryId,
        availableCredits: 295,
        idempotent: true,
      });
      await expectServiceCode(
        aiCredits.consume(
          organizationId,
          'DOCUMENT_EXTRACTION',
          referenceId,
          3,
        ),
        'AI_CREDIT_REFERENCE_CONFLICT',
      );

      const refunded = await aiCredits.refund(organizationId, charged.entryId);
      expect(refunded).toMatchObject({
        credits: 5,
        availableCredits: 300,
        idempotent: false,
      });
      await expect(
        aiCredits.refund(organizationId, charged.entryId),
      ).resolves.toMatchObject({
        entryId: refunded.entryId,
        availableCredits: 300,
        idempotent: true,
      });
    } finally {
      if (consumptionId)
        await prisma.aiCreditLedger.deleteMany({
          where: {
            organizationId,
            OR: [{ id: consumptionId }, { referenceId: consumptionId }],
          },
        });
    }
  });

  it('rejects exhausted credit charges without writing a ledger entry', async () => {
    const referenceId = randomUUID();
    await expectServiceCode(
      aiCredits.consume(
        organizationId,
        'DOCUMENT_EXTRACTION',
        referenceId,
        301,
      ),
      'AI_CREDITS_EXHAUSTED',
    );
    expect(await prisma.aiCreditLedger.count({ where: { referenceId } })).toBe(
      0,
    );
  });

  it('serializes concurrent charges so the balance cannot be overspent', async () => {
    const referenceIds = [randomUUID(), randomUUID()];
    try {
      const results = await Promise.allSettled(
        referenceIds.map((referenceId) =>
          aiCredits.consume(organizationId, 'REPORT_SUMMARY', referenceId, 200),
        ),
      );
      const fulfilled = results.filter(
        (result): result is PromiseFulfilledResult<unknown> =>
          result.status === 'fulfilled',
      );
      const rejected = results.filter(
        (result): result is PromiseRejectedResult =>
          result.status === 'rejected',
      );
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      const error = rejected[0].reason as unknown;
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toMatchObject({
        code: 'AI_CREDITS_EXHAUSTED',
      });
    } finally {
      await prisma.aiCreditLedger.deleteMany({
        where: { organizationId, referenceId: { in: referenceIds } },
      });
    }
  });

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
});

async function expectServiceCode(
  operation: Promise<unknown>,
  expectedCode: string,
): Promise<void> {
  try {
    await operation;
    throw new Error(`Expected ${expectedCode} but the operation succeeded.`);
  } catch (error) {
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getResponse()).toMatchObject({
      code: expectedCode,
    });
  }
}
