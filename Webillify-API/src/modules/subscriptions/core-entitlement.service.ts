import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { isSubscriptionUsable } from './subscription.types';

@Injectable()
export class CoreEntitlementService {
  constructor(private readonly prisma: PrismaService) {}

  async listPlans(): Promise<object[]> {
    const now = new Date();
    const plans = await this.prisma.plan.findMany({
      where: { active: true },
      include: {
        versions: {
          where: {
            effectiveFrom: { lte: now },
            OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
          },
          include: { entitlements: true },
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });
    return plans
      .filter(({ versions }) => versions.length === 1)
      .map(({ code, name, versions }) => {
        const version = versions[0];
        return {
          code,
          name,
          version: version.version,
          currency: version.currency,
          monthlyPrice: version.monthlyPrice.toString(),
          annualPrice: version.annualPrice.toString(),
          effectiveFrom: version.effectiveFrom,
          entitlements: toEntitlementRecord(version.entitlements),
        };
      });
  }

  async getSubscription(organizationId: string): Promise<object> {
    const subscription = await this.loadSubscription(organizationId);
    if (!subscription) {
      return {
        subscription: null,
        mutationAllowed: false,
        denialCode: 'CORE_SUBSCRIPTION_REQUIRED',
      };
    }
    const mutationAllowed = isSubscriptionUsable(
      subscription.status,
      subscription.currentPeriodEnd,
    );
    return {
      subscription: {
        id: subscription.id,
        status: subscription.status,
        billingInterval: subscription.billingInterval,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        plan: {
          code: subscription.planVersion.plan.code,
          name: subscription.planVersion.plan.name,
          version: subscription.planVersion.version,
        },
        entitlements: toEntitlementRecord(
          subscription.planVersion.entitlements,
        ),
      },
      mutationAllowed,
      denialCode: mutationAllowed ? null : 'CORE_SUBSCRIPTION_INACTIVE',
    };
  }

  async getUsage(organizationId: string): Promise<object> {
    const [subscription, companies, branches, users] = await Promise.all([
      this.getSubscription(organizationId),
      this.prisma.company.count({ where: { organizationId, active: true } }),
      this.prisma.branch.count({ where: { organizationId, active: true } }),
      this.prisma.organizationMembership.count({
        where: { organizationId, status: 'ACTIVE' },
      }),
    ]);
    return {
      ...subscription,
      usage: {
        companies,
        branches,
        users,
        salesInvoicesThisPeriod: null,
      },
    };
  }

  async assertMutationAllowed(organizationId: string): Promise<void> {
    const subscription = await this.loadSubscription(organizationId);
    if (
      subscription &&
      isSubscriptionUsable(subscription.status, subscription.currentPeriodEnd)
    )
      return;
    throw subscriptionRequired(
      subscription
        ? 'CORE_SUBSCRIPTION_INACTIVE'
        : 'CORE_SUBSCRIPTION_REQUIRED',
    );
  }

  private loadSubscription(organizationId: string) {
    return this.prisma.subscription.findUnique({
      where: { organizationId },
      include: {
        planVersion: {
          include: { plan: true, entitlements: true },
        },
      },
    });
  }
}

function toEntitlementRecord(
  entitlements: readonly { key: string; value: Prisma.JsonValue }[],
): Record<string, Prisma.JsonValue> {
  return Object.fromEntries(entitlements.map(({ key, value }) => [key, value]));
}

function subscriptionRequired(code: string): HttpException {
  return new HttpException(
    {
      code,
      message: 'An active core subscription is required for this operation.',
    },
    HttpStatus.PAYMENT_REQUIRED,
  );
}
