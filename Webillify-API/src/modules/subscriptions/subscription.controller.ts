import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionGuard } from '../../core/authorization/permission.guard';
import { RequirePermissions } from '../../core/authorization/require-permissions.decorator';
import { TenantAccessGuard } from '../../core/authorization/tenant-access.guard';
import type { TenantRequest } from '../../core/authorization/authorization.types';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CoreEntitlementService } from './core-entitlement.service';

@ApiTags('subscriptions')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, TenantAccessGuard, PermissionGuard)
@RequirePermissions('subscriptions.manage')
@Controller()
export class SubscriptionController {
  constructor(private readonly core: CoreEntitlementService) {}

  @Get('subscription')
  @ApiOperation({ summary: 'Get the current core subscription only' })
  subscription(@Req() request: TenantRequest): Promise<object> {
    return this.core.getSubscription(request.tenant.organizationId);
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get current core-plan resource usage' })
  usage(@Req() request: TenantRequest): Promise<object> {
    return this.core.getUsage(request.tenant.organizationId);
  }
}
