import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AiCreditEntryType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { isSubscriptionUsable } from './subscription.types';

export interface CreditMutationResult {
  readonly entryId: string;
  readonly credits: number;
  readonly availableCredits: number;
  readonly idempotent: boolean;
}

export const WEBILLIFY_AI_PLAN = {
  code: 'WEBILLIFY_AI',
  name: 'Webillify AI',
  separateFromCore: true,
  currency: 'INR',
  monthlyPrice: '799.00',
  monthlyCredits: 1500,
  trialDays: 14,
  trialCredits: 300,
  creditPack: { credits: 1000, price: '299.00' },
  capabilities: {
    textQuestionOrReminder: 1,
    reportSummaryOrAnomalyScan: 3,
    documentPageExtraction: 5,
  },
} as const;

@Injectable()
export class AiCreditService {
  constructor(private readonly prisma: PrismaService) {}

  getPlan(): object {
    return WEBILLIFY_AI_PLAN;
  }

  async getUsage(organizationId: string): Promise<object> {
    const now = new Date();
    const [subscription, balance] = await Promise.all([
      this.prisma.aiSubscription.findUnique({ where: { organizationId } }),
      this.balance(this.prisma, organizationId, now),
    ]);
    return {
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            monthlyCredits: subscription.monthlyCredits,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
          }
        : null,
      usable: subscription
        ? isSubscriptionUsable(
            subscription.status,
            subscription.currentPeriodEnd,
            now,
          ) && balance > 0
        : false,
      availableCredits: balance,
    };
  }

  async consume(
    organizationId: string,
    capability: string,
    referenceId: string,
    credits: number,
  ): Promise<CreditMutationResult> {
    validateCredits(credits);
    validateCapability(capability);
    return this.serializableTransaction(async (transaction) => {
      await lockAiSubscription(transaction, organizationId);
      const now = new Date();
      const [core, ai] = await Promise.all([
        transaction.subscription.findUnique({ where: { organizationId } }),
        transaction.aiSubscription.findUnique({ where: { organizationId } }),
      ]);
      if (
        !core ||
        !isSubscriptionUsable(core.status, core.currentPeriodEnd, now)
      )
        throw paymentRequired(
          core ? 'CORE_SUBSCRIPTION_INACTIVE' : 'CORE_SUBSCRIPTION_REQUIRED',
          'An active core subscription is required to use Webillify AI.',
        );
      if (!ai || !isSubscriptionUsable(ai.status, ai.currentPeriodEnd, now))
        throw paymentRequired(
          ai ? 'AI_SUBSCRIPTION_INACTIVE' : 'AI_SUBSCRIPTION_REQUIRED',
          'An active Webillify AI subscription is required.',
        );

      const existing = await transaction.aiCreditLedger.findUnique({
        where: {
          organizationId_entryType_referenceType_referenceId: {
            organizationId,
            entryType: AiCreditEntryType.CONSUME,
            referenceType: capability,
            referenceId,
          },
        },
      });
      const available = await this.balance(transaction, organizationId, now);
      if (existing) {
        if (existing.credits !== -credits)
          throw new ConflictException({
            code: 'AI_CREDIT_REFERENCE_CONFLICT',
            message:
              'This AI request reference was already charged differently.',
          });
        return {
          entryId: existing.id,
          credits,
          availableCredits: available,
          idempotent: true,
        };
      }
      if (available < credits)
        throw new ConflictException({
          code: 'AI_CREDITS_EXHAUSTED',
          message: 'The Webillify AI credit balance is insufficient.',
        });

      const entry = await transaction.aiCreditLedger.create({
        data: {
          organizationId,
          entryType: AiCreditEntryType.CONSUME,
          credits: -credits,
          referenceType: capability,
          referenceId,
          expiresAt: ai.currentPeriodEnd,
        },
      });
      return {
        entryId: entry.id,
        credits,
        availableCredits: available - credits,
        idempotent: false,
      };
    });
  }

  async refund(
    organizationId: string,
    consumptionEntryId: string,
  ): Promise<CreditMutationResult> {
    return this.serializableTransaction(async (transaction) => {
      await lockAiSubscription(transaction, organizationId);
      const now = new Date();
      const consumption = await transaction.aiCreditLedger.findFirst({
        where: {
          id: consumptionEntryId,
          organizationId,
          entryType: AiCreditEntryType.CONSUME,
        },
      });
      if (!consumption)
        throw new NotFoundException({
          code: 'AI_CONSUMPTION_NOT_FOUND',
          message: 'The AI credit charge was not found.',
        });
      const existing = await transaction.aiCreditLedger.findUnique({
        where: {
          organizationId_entryType_referenceType_referenceId: {
            organizationId,
            entryType: AiCreditEntryType.REFUND,
            referenceType: 'AI_CONSUMPTION',
            referenceId: consumption.id,
          },
        },
      });
      const available = await this.balance(transaction, organizationId, now);
      if (existing)
        return {
          entryId: existing.id,
          credits: existing.credits,
          availableCredits: available,
          idempotent: true,
        };
      const ai = await transaction.aiSubscription.findUniqueOrThrow({
        where: { organizationId },
      });
      const entry = await transaction.aiCreditLedger.create({
        data: {
          organizationId,
          entryType: AiCreditEntryType.REFUND,
          credits: -consumption.credits,
          referenceType: 'AI_CONSUMPTION',
          referenceId: consumption.id,
          expiresAt: ai.currentPeriodEnd,
        },
      });
      return {
        entryId: entry.id,
        credits: entry.credits,
        availableCredits: available + entry.credits,
        idempotent: false,
      };
    });
  }

  private async serializableTransaction<T>(
    operation: (transaction: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    const maximumAttempts = 3;
    for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        if (!isSerializationConflict(error) || attempt === maximumAttempts)
          throw error;
      }
    }
    throw new Error('Serializable transaction retry loop exhausted.');
  }

  private async balance(
    transaction: PrismaService | Prisma.TransactionClient,
    organizationId: string,
    now: Date,
  ): Promise<number> {
    const aggregate = await transaction.aiCreditLedger.aggregate({
      where: {
        organizationId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      _sum: { credits: true },
    });
    return aggregate._sum.credits ?? 0;
  }
}

async function lockAiSubscription(
  transaction: Prisma.TransactionClient,
  organizationId: string,
): Promise<void> {
  await transaction.$queryRaw(
    Prisma.sql`SELECT "id" FROM "ai_subscriptions" WHERE "organization_id" = ${organizationId}::uuid FOR UPDATE`,
  );
}

function validateCredits(credits: number): void {
  if (!Number.isSafeInteger(credits) || credits <= 0)
    throw new BadRequestException({
      code: 'INVALID_AI_CREDIT_CHARGE',
      message: 'AI credit charges must be positive whole numbers.',
    });
}

function validateCapability(capability: string): void {
  if (!/^[A-Z][A-Z0-9_]{1,59}$/.test(capability))
    throw new BadRequestException({
      code: 'INVALID_AI_CAPABILITY',
      message: 'The AI capability reference is invalid.',
    });
}

function paymentRequired(code: string, message: string): HttpException {
  return new HttpException({ code, message }, HttpStatus.PAYMENT_REQUIRED);
}

function isSerializationConflict(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error))
    return false;
  if (error.code === 'P2034') return true;
  const metadata = 'meta' in error ? error.meta : undefined;
  return (
    error.code === 'P2010' &&
    typeof metadata === 'object' &&
    metadata !== null &&
    'code' in metadata &&
    metadata.code === '40001'
  );
}
