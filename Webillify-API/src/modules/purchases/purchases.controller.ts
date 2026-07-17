import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { TenantRequest } from '../../core/authorization/authorization.types';
import { PermissionGuard } from '../../core/authorization/permission.guard';
import { RequirePermissions } from '../../core/authorization/require-permissions.decorator';
import { TenantAccessGuard } from '../../core/authorization/tenant-access.guard';
import type { CorrelatedRequest } from '../../core/http/correlation-id.middleware';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CancelPurchaseBillDto } from './dto/cancel-purchase-bill.dto';
import { CreatePurchaseBillDto } from './dto/create-purchase-bill.dto';
import { CreatePurchaseReturnDto } from './dto/create-purchase-return.dto';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { PurchasesService } from './purchases.service';

@ApiTags('purchases')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, TenantAccessGuard, PermissionGuard)
@RequirePermissions('purchases.read')
@Controller()
export class PurchasesController {
  constructor(private readonly purchases: PurchasesService) {}

  @Get('suppliers')
  suppliers(@Req() request: TenantRequest): Promise<object[]> {
    return this.purchases.listSuppliers(request.tenant.organizationId);
  }

  @Post('suppliers')
  @RequirePermissions('purchases.manage')
  createSupplier(
    @Req() request: TenantRequest,
    @Body() input: CreateSupplierDto,
  ): Promise<object> {
    return this.purchases.createSupplier(request.tenant.organizationId, input);
  }

  @Get('purchase-bills')
  bills(@Req() request: TenantRequest): Promise<object[]> {
    return this.purchases.listBills(request.tenant);
  }

  @Get('purchase-bills/:id')
  bill(
    @Req() request: TenantRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<object> {
    return this.purchases.getBill(request.tenant, id);
  }

  @Post('purchase-bills')
  @RequirePermissions('purchases.manage')
  createBill(
    @Req() request: TenantRequest,
    @Body() input: CreatePurchaseBillDto,
  ): Promise<object> {
    return this.purchases.createDraft(request.tenant, input);
  }

  @Post('purchase-bills/:id/post')
  @RequirePermissions('purchases.manage')
  postBill(
    @Req() request: TenantRequest & CorrelatedRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Headers('idempotency-key') idempotencyKey: string,
  ): Promise<object> {
    return this.purchases.postBill(
      request.tenant,
      request.identity.userId,
      request.correlationId,
      idempotencyKey,
      id,
    );
  }

  @Post('purchase-bills/:id/cancel')
  @RequirePermissions('purchases.manage')
  cancelBill(
    @Req() request: TenantRequest & CorrelatedRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() input: CancelPurchaseBillDto,
  ): Promise<object> {
    return this.purchases.cancelBill(
      request.tenant,
      request.identity.userId,
      request.correlationId,
      idempotencyKey,
      id,
      input,
    );
  }

  @Post('purchase-returns')
  @RequirePermissions('purchases.manage')
  createReturn(
    @Req() request: TenantRequest & CorrelatedRequest,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() input: CreatePurchaseReturnDto,
  ): Promise<object> {
    return this.purchases.createReturn(
      request.tenant,
      request.identity.userId,
      request.correlationId,
      idempotencyKey,
      input,
    );
  }

  @Post('supplier-payments')
  @RequirePermissions('purchases.manage')
  paySupplier(
    @Req() request: TenantRequest & CorrelatedRequest,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() input: CreateSupplierPaymentDto,
  ): Promise<object> {
    return this.purchases.paySupplier(
      request.tenant,
      request.identity.userId,
      request.correlationId,
      idempotencyKey,
      input,
    );
  }
}
