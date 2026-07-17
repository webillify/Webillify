import {
  MembershipStatus,
  OrganizationStatus,
  PrismaClient,
  SubscriptionStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

const ids = {
  user: '10000000-0000-4000-8000-000000000001',
  organization: '20000000-0000-4000-8000-000000000001',
  company: '30000000-0000-4000-8000-000000000001',
  branch: '40000000-0000-4000-8000-000000000001',
  membership: '50000000-0000-4000-8000-000000000001',
};

const permissionDefinitions = [
  ['dashboard.read', 'View operational dashboard', false],
  ['pos.create', 'Create and post point-of-sale invoices', true],
  ['products.read', 'View the product catalogue', false],
  ['products.manage', 'Create and update products', true],
  ['customers.read', 'View customers and balances', false],
  ['customers.manage', 'Manage customers and receipts', true],
  ['purchases.read', 'View suppliers and purchase bills', false],
  ['purchases.manage', 'Manage purchase bills and payments', true],
  ['reports.read', 'View authorized reports', false],
  ['settings.manage', 'Manage organization settings and access', true],
  ['subscriptions.manage', 'Manage core and AI subscriptions', true],
  ['ai.use', 'Use separately entitled Webillify AI capabilities', true],
] as const;

async function main(): Promise<void> {
  const permissions = await Promise.all(
    permissionDefinitions.map(([code, description, sensitive]) =>
      prisma.permission.upsert({
        where: { code },
        update: { description, sensitive },
        create: { code, description, sensitive },
      }),
    ),
  );

  const organization = await prisma.organization.upsert({
    where: { id: ids.organization },
    update: {},
    create: {
      id: ids.organization,
      name: 'Webillify Demo Retail',
      slug: 'webillify-demo-retail',
      status: OrganizationStatus.TRIALING,
    },
  });

  const user = await prisma.user.upsert({
    where: { normalizedEmail: 'owner@webillify.demo' },
    update: { displayName: 'PK Samy' },
    create: {
      id: ids.user,
      email: 'owner@webillify.demo',
      normalizedEmail: 'owner@webillify.demo',
      displayName: 'PK Samy',
      status: 'INVITED',
    },
  });

  const company = await prisma.company.upsert({
    where: {
      organizationId_normalizedCode: {
        organizationId: organization.id,
        normalizedCode: 'DEMO',
      },
    },
    update: {},
    create: {
      id: ids.company,
      organizationId: organization.id,
      legalName: 'Webillify Demo Retail Private Limited',
      tradeName: 'Ageera',
      normalizedCode: 'DEMO',
    },
  });

  const branch = await prisma.branch.upsert({
    where: {
      organizationId_normalizedCode: {
        organizationId: organization.id,
        normalizedCode: 'CHENNAI',
      },
    },
    update: {},
    create: {
      id: ids.branch,
      organizationId: organization.id,
      companyId: company.id,
      name: 'Chennai',
      normalizedCode: 'CHENNAI',
    },
  });

  const membership = await prisma.organizationMembership.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user.id,
      },
    },
    update: { status: MembershipStatus.ACTIVE },
    create: {
      id: ids.membership,
      organizationId: organization.id,
      userId: user.id,
      status: MembershipStatus.ACTIVE,
      joinedAt: new Date(),
    },
  });

  const ownerRole = await prisma.role.upsert({
    where: {
      organizationId_code: { organizationId: organization.id, code: 'OWNER' },
    },
    update: {},
    create: {
      organizationId: organization.id,
      code: 'OWNER',
      name: 'Organization Owner',
      system: true,
    },
  });

  await prisma.$transaction([
    ...permissions.map((permission) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: ownerRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: ownerRole.id,
          permissionId: permission.id,
          organizationId: organization.id,
        },
      }),
    ),
    prisma.membershipRole.upsert({
      where: {
        membershipId_roleId: {
          membershipId: membership.id,
          roleId: ownerRole.id,
        },
      },
      update: {},
      create: {
        membershipId: membership.id,
        roleId: ownerRole.id,
        organizationId: organization.id,
      },
    }),
    prisma.userBranchAccess.upsert({
      where: {
        membershipId_branchId: {
          membershipId: membership.id,
          branchId: branch.id,
        },
      },
      update: {},
      create: {
        membershipId: membership.id,
        branchId: branch.id,
        organizationId: organization.id,
      },
    }),
  ]);

  const plan = await prisma.plan.upsert({
    where: { code: 'BUSINESS' },
    update: {},
    create: { code: 'BUSINESS', name: 'Business' },
  });
  const planVersion = await prisma.planVersion.upsert({
    where: { planId_version: { planId: plan.id, version: 1 } },
    update: {},
    create: {
      planId: plan.id,
      version: 1,
      monthlyPrice: '999.00',
      annualPrice: '9990.00',
      effectiveFrom: new Date('2026-07-01T00:00:00.000Z'),
    },
  });
  const periodStart = new Date('2026-07-01T00:00:00.000Z');
  const periodEnd = new Date('2026-08-01T00:00:00.000Z');
  await prisma.subscription.upsert({
    where: { organizationId: organization.id },
    update: {},
    create: {
      organizationId: organization.id,
      planVersionId: planVersion.id,
      status: SubscriptionStatus.TRIALING,
      billingInterval: 'MONTHLY',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    },
  });
  await prisma.aiSubscription.upsert({
    where: { organizationId: organization.id },
    update: {},
    create: {
      organizationId: organization.id,
      status: SubscriptionStatus.TRIALING,
      monthlyCredits: 300,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
