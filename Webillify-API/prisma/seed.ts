import {
  MembershipStatus,
  OrganizationStatus,
  PrismaClient,
  SubscriptionStatus,
} from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

const ids = {
  user: '10000000-0000-4000-8000-000000000001',
  cashierUser: '10000000-0000-4000-8000-000000000002',
  organization: '20000000-0000-4000-8000-000000000001',
  company: '30000000-0000-4000-8000-000000000001',
  branch: '40000000-0000-4000-8000-000000000001',
  membership: '50000000-0000-4000-8000-000000000001',
  cashierMembership: '50000000-0000-4000-8000-000000000002',
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
  const demoPasswordHash = await argon2.hash('webillify', {
    type: argon2.argon2id,
  });
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
    update: {
      displayName: 'PK Samy',
      passwordHash: demoPasswordHash,
      status: 'ACTIVE',
    },
    create: {
      id: ids.user,
      email: 'owner@webillify.demo',
      normalizedEmail: 'owner@webillify.demo',
      displayName: 'PK Samy',
      passwordHash: demoPasswordHash,
      status: 'ACTIVE',
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

  const cashier = await prisma.user.upsert({
    where: { normalizedEmail: 'cashier@webillify.demo' },
    update: {
      displayName: 'Demo Cashier',
      passwordHash: demoPasswordHash,
      status: 'ACTIVE',
    },
    create: {
      id: ids.cashierUser,
      email: 'cashier@webillify.demo',
      normalizedEmail: 'cashier@webillify.demo',
      displayName: 'Demo Cashier',
      passwordHash: demoPasswordHash,
      status: 'ACTIVE',
    },
  });
  const cashierMembership = await prisma.organizationMembership.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: cashier.id,
      },
    },
    update: { status: MembershipStatus.ACTIVE },
    create: {
      id: ids.cashierMembership,
      organizationId: organization.id,
      userId: cashier.id,
      status: MembershipStatus.ACTIVE,
      joinedAt: new Date(),
    },
  });
  const cashierRole = await prisma.role.upsert({
    where: {
      organizationId_code: { organizationId: organization.id, code: 'CASHIER' },
    },
    update: {},
    create: {
      organizationId: organization.id,
      code: 'CASHIER',
      name: 'Cashier',
      system: true,
    },
  });
  const cashierPermissions = permissions.filter(({ code }) =>
    [
      'dashboard.read',
      'pos.create',
      'products.read',
      'customers.read',
    ].includes(code),
  );
  await prisma.$transaction([
    ...cashierPermissions.map((permission) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: cashierRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: cashierRole.id,
          permissionId: permission.id,
          organizationId: organization.id,
        },
      }),
    ),
    prisma.membershipRole.upsert({
      where: {
        membershipId_roleId: {
          membershipId: cashierMembership.id,
          roleId: cashierRole.id,
        },
      },
      update: {},
      create: {
        membershipId: cashierMembership.id,
        roleId: cashierRole.id,
        organizationId: organization.id,
      },
    }),
    prisma.userBranchAccess.upsert({
      where: {
        membershipId_branchId: {
          membershipId: cashierMembership.id,
          branchId: branch.id,
        },
      },
      update: {},
      create: {
        membershipId: cashierMembership.id,
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
