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
