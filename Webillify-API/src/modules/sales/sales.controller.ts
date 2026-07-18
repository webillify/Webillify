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
import { OpenPosSessionDto } from './dto/open-pos-session.dto';
import { PostSalesInvoiceDto } from './dto/post-sales-invoice.dto';
import { CancelSalesInvoiceDto } from './dto/cancel-sales-invoice.dto';
import { CreateSalesReturnDto } from './dto/create-sales-return.dto';
import { SalesService } from './sales.service';

@ApiTags('sales')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, TenantAccessGuard, PermissionGuard)
@RequirePermissions('pos.create')
@Controller()
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Get('pos-sessions')
  sessions(@Req() request: TenantRequest): Promise<object[]> {
    return this.sales.listSessions(request.tenant);
  }

  @Post('pos-sessions/open')
  openSession(
    @Req() request: TenantRequest & CorrelatedRequest,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() input: OpenPosSessionDto,
  ): Promise<object> {
    return this.sales.openSession(
      request.tenant,
      request.identity.userId,
      request.correlationId,
      idempotencyKey,
      input,
    );
  }

  @Get('sales-invoices')
  invoices(@Req() request: TenantRequest): Promise<object[]> {
    return this.sales.listInvoices(request.tenant);
  }

  @Get('sales-invoices/:id')
  invoice(
    @Req() request: TenantRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<object> {
    return this.sales.getInvoice(request.tenant, id);
  }

  @Post('sales-invoices/post')
  postInvoice(
    @Req() request: TenantRequest & CorrelatedRequest,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() input: PostSalesInvoiceDto,
  ): Promise<object> {
    return this.sales.postInvoice(
      request.tenant,
      request.identity.userId,
      request.correlationId,
      idempotencyKey,
      input,
    );
  }

  @Post('sales-invoices/:id/cancel')
  cancelInvoice(
    @Req() request: TenantRequest & CorrelatedRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() input: CancelSalesInvoiceDto,
  ): Promise<object> {
    return this.sales.cancelInvoice(
      request.tenant,
      request.identity.userId,
      request.correlationId,
      id,
      idempotencyKey,
      input,
    );
  }

  @Post('sales-returns')
  createReturn(
    @Req() request: TenantRequest & CorrelatedRequest,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() input: CreateSalesReturnDto,
  ): Promise<object> {
    return this.sales.createReturn(
      request.tenant,
      request.identity.userId,
      request.correlationId,
      idempotencyKey,
      input,
    );
  }
}
