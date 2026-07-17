import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { AuthModule } from '../auth/auth.module';
import { AiCreditService } from './ai-credit.service';
import { AiSubscriptionController } from './ai-subscription.controller';
import { CoreEntitlementService } from './core-entitlement.service';
import { PlansController } from './plans.controller';
import { SubscriptionController } from './subscription.controller';

@Module({
  imports: [AuthModule, AccessModule],
  controllers: [
    PlansController,
    SubscriptionController,
    AiSubscriptionController,
  ],
  providers: [CoreEntitlementService, AiCreditService],
  exports: [CoreEntitlementService, AiCreditService],
})
export class SubscriptionsModule {}
