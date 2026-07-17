import {
  AiCreditEntryType,
  MembershipStatus,
  OrganizationStatus,
  PrismaClient,
  StockMovementType,
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
  category: '60000000-0000-4000-8000-000000000001',
  unit: '70000000-0000-4000-8000-000000000001',
  taxRate: '80000000-0000-4000-8000-000000000001',
  product: '90000000-0000-4000-8000-000000000001',
  variant: 'a0000000-0000-4000-8000-000000000001',
  barcode: 'b0000000-0000-4000-8000-000000000001',
  warehouse: 'c0000000-0000-4000-8000-000000000001',
  openingStockSource: 'd0000000-0000-4000-8000-000000000001',
  supplier: 'e0000000-0000-4000-8000-000000000001',
  purchaseBill: 'f0000000-0000-4000-8000-000000000001',
  purchaseBillItem: 'f1000000-0000-4000-8000-000000000001',
  customer: 'f2000000-0000-4000-8000-000000000001',
  invoiceSeries: 'f3000000-0000-4000-8000-000000000001',
};

const permissionDefinitions = [
  ['dashboard.read', 'View operational dashboard', false],
  ['pos.create', 'Create and post point-of-sale invoices', true],
  ['products.read', 'View the product catalogue', false],
  ['products.manage', 'Create and update products', true],
  ['inventory.read', 'View stock balances and movements', false],
  ['inventory.adjust', 'Post reviewed stock adjustments', true],
  ['customers.read', 'View customers and balances', false],
  ['customers.manage', 'Manage customers and receipts', true],
  ['purchases.read', 'View suppliers and purchase bills', false],
  ['purchases.manage', 'Manage purchase bills and payments', true],
  ['reports.read', 'View authorized reports', false],
  ['settings.manage', 'Manage organization settings and access', true],
  ['subscriptions.manage', 'Manage core and AI subscriptions', true],
  ['ai.use', 'Use separately entitled Webillify AI capabilities', true],
] as const;

const corePlans = [
  {
    code: 'STARTER',
    name: 'Starter',
    monthlyPrice: '499.00',
    annualPrice: '4990.00',
    entitlements: {
      'companies.max': 1,
      'branches.max': 1,
      'users.max': 2,
      'sales_invoices.monthly_max': 2_000,
      'billing.enabled': true,
      'inventory.enabled': true,
      'purchases.level': 'BASIC',
      'expenses.level': 'BASIC',
      'reports.standard': true,
      'branch_transfers.enabled': false,
      'serial_numbers.enabled': false,
      'exports.advanced': false,
      'roles.custom': false,
      'public_api.enabled': false,
    },
  },
  {
    code: 'BUSINESS',
    name: 'Business',
    monthlyPrice: '999.00',
    annualPrice: '9990.00',
    entitlements: {
      'companies.max': 1,
      'branches.max': 3,
      'users.max': 10,
      'sales_invoices.monthly_max': 10_000,
      'billing.enabled': true,
      'inventory.enabled': true,
      'purchases.level': 'FULL',
      'expenses.level': 'FULL',
      'reports.standard': true,
      'branch_transfers.enabled': true,
      'serial_numbers.enabled': true,
      'exports.advanced': true,
      'roles.custom': false,
      'public_api.enabled': false,
    },
  },
  {
    code: 'PRO',
    name: 'Pro',
    monthlyPrice: '1999.00',
    annualPrice: '19990.00',
    entitlements: {
      'companies.max': 3,
      'branches.max': 10,
      'users.max': 30,
      'sales_invoices.monthly_max': 50_000,
      'billing.enabled': true,
      'inventory.enabled': true,
      'purchases.level': 'FULL',
      'expenses.level': 'FULL',
      'reports.standard': true,
      'branch_transfers.enabled': true,
      'serial_numbers.enabled': true,
      'exports.advanced': true,
      'roles.custom': false,
      'public_api.enabled': false,
    },
  },
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

  const effectiveFrom = new Date('2026-07-01T00:00:00.000Z');
  const planVersions = await Promise.all(
    corePlans.map(async (definition) => {
      const plan = await prisma.plan.upsert({
        where: { code: definition.code },
        update: { name: definition.name, active: true },
        create: {
          code: definition.code,
          name: definition.name,
          active: true,
        },
      });
      const version = await prisma.planVersion.upsert({
        where: { planId_version: { planId: plan.id, version: 1 } },
        update: {
          monthlyPrice: definition.monthlyPrice,
          annualPrice: definition.annualPrice,
          effectiveFrom,
        },
        create: {
          planId: plan.id,
          version: 1,
          monthlyPrice: definition.monthlyPrice,
          annualPrice: definition.annualPrice,
          effectiveFrom,
        },
      });
      await Promise.all(
        Object.entries(definition.entitlements).map(([key, value]) =>
          prisma.planEntitlement.upsert({
            where: { planVersionId_key: { planVersionId: version.id, key } },
            update: { value },
            create: { planVersionId: version.id, key, value },
          }),
        ),
      );
      return { code: definition.code, version };
    }),
  );
  const businessVersion = planVersions.find(({ code }) => code === 'BUSINESS');
  if (!businessVersion) throw new Error('Business plan seed is missing.');
  const periodStart = new Date('2026-07-01T00:00:00.000Z');
  const periodEnd = new Date('2026-08-01T00:00:00.000Z');
  await prisma.subscription.upsert({
    where: { organizationId: organization.id },
    update: {},
    create: {
      organizationId: organization.id,
      planVersionId: businessVersion.version.id,
      status: SubscriptionStatus.TRIALING,
      billingInterval: 'MONTHLY',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    },
  });
  const aiSubscription = await prisma.aiSubscription.upsert({
    where: { organizationId: organization.id },
    update: {
      status: SubscriptionStatus.TRIALING,
      monthlyCredits: 300,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    },
    create: {
      organizationId: organization.id,
      status: SubscriptionStatus.TRIALING,
      monthlyCredits: 300,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    },
  });
  await prisma.aiCreditLedger.upsert({
    where: {
      organizationId_entryType_referenceType_referenceId: {
        organizationId: organization.id,
        entryType: AiCreditEntryType.GRANT,
        referenceType: 'AI_SUBSCRIPTION_PERIOD',
        referenceId: aiSubscription.id,
      },
    },
    update: { credits: 300, expiresAt: periodEnd },
    create: {
      organizationId: organization.id,
      entryType: AiCreditEntryType.GRANT,
      credits: 300,
      referenceType: 'AI_SUBSCRIPTION_PERIOD',
      referenceId: aiSubscription.id,
      expiresAt: periodEnd,
    },
  });

  const category = await prisma.category.upsert({
    where: {
      organizationId_normalizedCode: {
        organizationId: organization.id,
        normalizedCode: 'GROCERY',
      },
    },
    update: { name: 'Grocery', active: true },
    create: {
      id: ids.category,
      organizationId: organization.id,
      name: 'Grocery',
      normalizedCode: 'GROCERY',
    },
  });
  const unit = await prisma.unit.upsert({
    where: {
      organizationId_code: {
        organizationId: organization.id,
        code: 'KG',
      },
    },
    update: { name: 'Kilogram', symbol: 'kg', active: true },
    create: {
      id: ids.unit,
      organizationId: organization.id,
      code: 'KG',
      name: 'Kilogram',
      symbol: 'kg',
      decimalPlaces: 3,
    },
  });
  const taxRate = await prisma.taxRate.upsert({
    where: {
      organizationId_code_effectiveFrom: {
        organizationId: organization.id,
        code: 'GST5',
        effectiveFrom,
      },
    },
    update: { name: 'GST 5%', rate: '5.00', cessRate: '0.00', active: true },
    create: {
      id: ids.taxRate,
      organizationId: organization.id,
      code: 'GST5',
      name: 'GST 5%',
      rate: '5.00',
      effectiveFrom,
    },
  });
  const product = await prisma.product.upsert({
    where: {
      organizationId_normalizedCode: {
        organizationId: organization.id,
        normalizedCode: 'RICE-PREMIUM',
      },
    },
    update: { name: 'Premium Rice', active: true },
    create: {
      id: ids.product,
      organizationId: organization.id,
      categoryId: category.id,
      baseUnitId: unit.id,
      defaultTaxRateId: taxRate.id,
      normalizedCode: 'RICE-PREMIUM',
      name: 'Premium Rice',
      productType: 'GOODS',
      hsnSac: '1006',
      priceTaxMode: 'EXCLUSIVE',
    },
  });
  const variant = await prisma.productVariant.upsert({
    where: {
      organizationId_sku: {
        organizationId: organization.id,
        sku: 'RICE-PREMIUM-1KG',
      },
    },
    update: {
      salePrice: '60.00',
      purchaseCost: '45.0000',
      active: true,
    },
    create: {
      id: ids.variant,
      organizationId: organization.id,
      productId: product.id,
      sku: 'RICE-PREMIUM-1KG',
      name: '1 kg',
      salePrice: '60.00',
      purchaseCost: '45.0000',
    },
  });
  await prisma.productBarcode.upsert({
    where: {
      organizationId_barcode: {
        organizationId: organization.id,
        barcode: '8901234567890',
      },
    },
    update: { variantId: variant.id, primary: true },
    create: {
      id: ids.barcode,
      organizationId: organization.id,
      variantId: variant.id,
      barcode: '8901234567890',
      primary: true,
    },
  });
  const warehouse = await prisma.warehouse.upsert({
    where: {
      organizationId_normalizedCode: {
        organizationId: organization.id,
        normalizedCode: 'CHENNAI-MAIN',
      },
    },
    update: { name: 'Chennai Main Stock', active: true },
    create: {
      id: ids.warehouse,
      organizationId: organization.id,
      companyId: company.id,
      branchId: branch.id,
      normalizedCode: 'CHENNAI-MAIN',
      name: 'Chennai Main Stock',
    },
  });
  const openingMovement = await prisma.stockMovement.findUnique({
    where: {
      organizationId_idempotencyKey_warehouseId_variantId_movementType: {
        organizationId: organization.id,
        idempotencyKey: 'seed-opening-stock-v1',
        warehouseId: warehouse.id,
        variantId: variant.id,
        movementType: StockMovementType.OPENING_STOCK,
      },
    },
  });
  if (!openingMovement)
    await prisma.stockMovement.create({
      data: {
        organizationId: organization.id,
        companyId: company.id,
        branchId: branch.id,
        warehouseId: warehouse.id,
        variantId: variant.id,
        actorUserId: user.id,
        movementType: StockMovementType.OPENING_STOCK,
        quantity: '100.000',
        unitCost: '45.0000',
        occurredAt: effectiveFrom,
        sourceType: 'OPENING_STOCK',
        sourceId: ids.openingStockSource,
        idempotencyKey: 'seed-opening-stock-v1',
      },
    });
  await prisma.stockBalance.upsert({
    where: {
      organizationId_warehouseId_variantId: {
        organizationId: organization.id,
        warehouseId: warehouse.id,
        variantId: variant.id,
      },
    },
    update: { quantity: '100.000', averageCost: '45.0000' },
    create: {
      organizationId: organization.id,
      warehouseId: warehouse.id,
      variantId: variant.id,
      quantity: '100.000',
      averageCost: '45.0000',
    },
  });

  const supplier = await prisma.supplier.upsert({
    where: {
      organizationId_normalizedCode: {
        organizationId: organization.id,
        normalizedCode: 'DEMO-SUPPLIER',
      },
    },
    update: { name: 'Demo Wholesale Supplier', active: true },
    create: {
      id: ids.supplier,
      organizationId: organization.id,
      normalizedCode: 'DEMO-SUPPLIER',
      name: 'Demo Wholesale Supplier',
      normalizedName: 'demo wholesale supplier',
      gstin: '33ABCDE1234F1Z5',
      creditDays: 30,
    },
  });
  const purchaseBill = await prisma.purchaseBill.upsert({
    where: {
      organizationId_companyId_supplierId_normalizedReference: {
        organizationId: organization.id,
        companyId: company.id,
        supplierId: supplier.id,
        normalizedReference: 'DEMO-INV-001',
      },
    },
    update: {},
    create: {
      id: ids.purchaseBill,
      organizationId: organization.id,
      companyId: company.id,
      branchId: branch.id,
      warehouseId: warehouse.id,
      supplierId: supplier.id,
      supplierInvoiceReference: 'DEMO-INV-001',
      normalizedReference: 'DEMO-INV-001',
      invoiceDate: new Date('2026-07-15T00:00:00.000Z'),
      dueDate: new Date('2026-08-14T00:00:00.000Z'),
      taxableValue: '45.00',
      cgstAmount: '1.13',
      sgstAmount: '1.12',
      totalAmount: '47.25',
      outstandingAmount: '47.25',
      inputTaxEligible: true,
    },
  });
  await prisma.purchaseBillItem.upsert({
    where: { id: ids.purchaseBillItem },
    update: {},
    create: {
      id: ids.purchaseBillItem,
      organizationId: organization.id,
      purchaseBillId: purchaseBill.id,
      variantId: variant.id,
      description: 'Premium Rice 1 kg',
      hsnSac: '1006',
      quantity: '1.000',
      unitCost: '45.0000',
      taxableValue: '45.00',
      taxRate: '5.00',
      cgstAmount: '1.13',
      sgstAmount: '1.12',
      lineTotal: '47.25',
      inputTaxEligible: true,
    },
  });

  await prisma.customer.upsert({
    where: {
      organizationId_normalizedCode: {
        organizationId: organization.id,
        normalizedCode: 'DEMO-CUSTOMER',
      },
    },
    update: { name: 'Demo Credit Customer', active: true },
    create: {
      id: ids.customer,
      organizationId: organization.id,
      normalizedCode: 'DEMO-CUSTOMER',
      name: 'Demo Credit Customer',
      normalizedName: 'demo credit customer',
      phone: '+919876543210',
      creditDays: 15,
      creditLimit: '25000.00',
    },
  });
  await prisma.invoiceSeries.upsert({
    where: {
      organizationId_companyId_documentType_financialYear_prefix: {
        organizationId: organization.id,
        companyId: company.id,
        documentType: 'SALES_INVOICE',
        financialYear: '2026-27',
        prefix: 'WBL',
      },
    },
    update: { active: true },
    create: {
      id: ids.invoiceSeries,
      organizationId: organization.id,
      companyId: company.id,
      documentType: 'SALES_INVOICE',
      financialYear: '2026-27',
      prefix: 'WBL',
      nextNumber: 1,
      padding: 5,
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
