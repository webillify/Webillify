import type { SubscriptionStatus } from '@prisma/client';

export const USABLE_SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = [
  'TRIALING',
  'ACTIVE',
];

export function isSubscriptionUsable(
  status: SubscriptionStatus,
  currentPeriodEnd: Date,
  now = new Date(),
): boolean {
  return (
    USABLE_SUBSCRIPTION_STATUSES.includes(status) && currentPeriodEnd > now
  );
}
