import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CoreEntitlementService } from './core-entitlement.service';

@ApiTags('subscriptions')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('plans')
export class PlansController {
  constructor(private readonly core: CoreEntitlementService) {}

  @Get()
  @ApiOperation({ summary: 'List current versioned core plans' })
  plans(): Promise<object[]> {
    return this.core.listPlans();
  }
}
