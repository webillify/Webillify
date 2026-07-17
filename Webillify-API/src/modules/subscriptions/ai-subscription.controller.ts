import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionGuard } from '../../core/authorization/permission.guard';
import { RequirePermissions } from '../../core/authorization/require-permissions.decorator';
import { TenantAccessGuard } from '../../core/authorization/tenant-access.guard';
import type { TenantRequest } from '../../core/authorization/authorization.types';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AiCreditService } from './ai-credit.service';

@ApiTags('Webillify AI subscription')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, TenantAccessGuard, PermissionGuard)
@RequirePermissions('ai.use')
@Controller('ai')
export class AiSubscriptionController {
  constructor(private readonly ai: AiCreditService) {}

  @Get('plan')
  @ApiOperation({ summary: 'Get the separately billed Webillify AI plan' })
  plan(): object {
    return this.ai.getPlan();
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get independent AI lifecycle and credit usage' })
  usage(@Req() request: TenantRequest): Promise<object> {
    return this.ai.getUsage(request.tenant.organizationId);
  }
}
