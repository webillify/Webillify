import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

describe('PostgreSQL identity and tenancy schema', () => {
  const prisma = new PrismaClient();

  beforeAll(async () => prisma.$connect());
  afterAll(async () => prisma.$disconnect());

  it('loads the deterministic tenant, owner access and separate subscriptions', async () => {
    const organization = await prisma.organization.findUniqueOrThrow({
      where: { slug: 'webillify-demo-retail' },
      include: {
        memberships: { include: { roles: true, branchAccess: true } },
        coreSubscription: true,
        aiSubscription: true,
        aiCreditEntries: true,
      },
    });

    expect(organization.memberships).toHaveLength(2);
    const ownerMembership = organization.memberships.find(
      (membership) =>
        membership.userId === '10000000-0000-4000-8000-000000000001',
    );
    expect(ownerMembership?.roles).toHaveLength(1);
    expect(ownerMembership?.branchAccess).toHaveLength(1);
    expect(organization.coreSubscription?.status).toBe('TRIALING');
    expect(organization.aiSubscription).toMatchObject({
      status: 'TRIALING',
      monthlyCredits: 300,
    });
    expect(organization.aiSubscription?.id).not.toBe(
      organization.coreSubscription?.id,
    );
    expect(organization.aiCreditEntries).toEqual([
      expect.objectContaining({
        entryType: 'GRANT',
        credits: 300,
        referenceType: 'AI_SUBSCRIPTION_PERIOD',
      }),
    ]);
  });

  it('stores all launch plans as independently versioned entitlement sets', async () => {
    const plans = await prisma.plan.findMany({
      include: { versions: { include: { entitlements: true } } },
      orderBy: { code: 'asc' },
    });

    expect(plans.map(({ code }) => code)).toEqual([
      'BUSINESS',
      'PRO',
      'STARTER',
    ]);
    for (const plan of plans) {
      expect(plan.versions).toHaveLength(1);
      expect(plan.versions[0].entitlements.length).toBeGreaterThanOrEqual(14);
    }
    const pro = plans.find(({ code }) => code === 'PRO');
    expect(
      pro?.versions[0].entitlements.find(({ key }) => key === 'branches.max')
        ?.value,
    ).toBe(10);
  });

  it('rejects duplicate AI ledger entries for one source reference', async () => {
    const organization = await prisma.organization.findUniqueOrThrow({
      where: { slug: 'webillify-demo-retail' },
      include: { aiSubscription: true },
    });
    await expect(
      prisma.aiCreditLedger.create({
        data: {
          organizationId: organization.id,
          entryType: 'GRANT',
          credits: 300,
          referenceType: 'AI_SUBSCRIPTION_PERIOD',
          referenceId: organization.aiSubscription!.id,
        },
      }),
    ).rejects.toThrow();
  });

  it('rejects a branch linked to a company from another organization', async () => {
    const demoCompany = await prisma.company.findFirstOrThrow({
      where: { organization: { slug: 'webillify-demo-retail' } },
    });
    const otherOrganization = await prisma.organization.create({
      data: {
        name: 'Isolation Test Tenant',
        slug: `isolation-${randomUUID()}`,
      },
    });

    try {
      await expect(
        prisma.$executeRaw`
          INSERT INTO "branches"
            ("id", "organization_id", "company_id", "name", "normalized_code", "timezone", "active", "created_at", "updated_at")
          VALUES
            (${randomUUID()}::uuid, ${otherOrganization.id}::uuid, ${demoCompany.id}::uuid, 'Invalid branch', 'INVALID', 'Asia/Kolkata', true, NOW(), NOW())
        `,
      ).rejects.toThrow();
    } finally {
      await prisma.organization.delete({ where: { id: otherOrganization.id } });
    }
  });
});
