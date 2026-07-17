import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PermissionGuard } from '../../core/authorization/permission.guard';
import { RequirePermissions } from '../../core/authorization/require-permissions.decorator';
import { TenantAccessGuard } from '../../core/authorization/tenant-access.guard';
import type { TenantRequest } from '../../core/authorization/authorization.types';
import type { CorrelatedRequest } from '../../core/http/correlation-id.middleware';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { StockAdjustmentDto } from './dto/stock-adjustment.dto';
import { StockService } from './stock.service';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, TenantAccessGuard, PermissionGuard)
@RequirePermissions('inventory.read')
@Controller()
export class StockController {
  constructor(private readonly stock: StockService) {}

  @Get('stock-balances')
  balances(@Req() request: TenantRequest): Promise<object[]> {
    return this.stock.listBalances(request.tenant);
  }

  @Get('stock-movements')
  movements(@Req() request: TenantRequest): Promise<object[]> {
    return this.stock.listMovements(request.tenant);
  }

  @Post('stock-adjustments')
  @RequirePermissions('inventory.adjust')
  adjust(
    @Req() request: TenantRequest & CorrelatedRequest,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() input: StockAdjustmentDto,
  ): Promise<object> {
    return this.stock.adjust(
      request.tenant,
      request.identity.userId,
      request.correlationId,
      idempotencyKey,
      input,
    );
  }
}
