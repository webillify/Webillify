import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PermissionGuard } from '../../core/authorization/permission.guard';
import { RequirePermissions } from '../../core/authorization/require-permissions.decorator';
import { TenantAccessGuard } from '../../core/authorization/tenant-access.guard';
import type { TenantRequest } from '../../core/authorization/authorization.types';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CatalogueService } from './catalogue.service';
import { CreateProductDto } from './dto/create-product.dto';

@ApiTags('catalogue')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, TenantAccessGuard, PermissionGuard)
@RequirePermissions('products.read')
@Controller()
export class CatalogueController {
  constructor(private readonly catalogue: CatalogueService) {}

  @Get('products')
  products(@Req() request: TenantRequest): Promise<object[]> {
    return this.catalogue.listProducts(request.tenant.organizationId);
  }

  @Get('products/:id')
  product(
    @Req() request: TenantRequest,
    @Param('id') id: string,
  ): Promise<object> {
    return this.catalogue.getProduct(request.tenant.organizationId, id);
  }

  @Post('products')
  @RequirePermissions('products.manage')
  createProduct(
    @Req() request: TenantRequest,
    @Body() input: CreateProductDto,
  ): Promise<object> {
    return this.catalogue.createProduct(request.tenant.organizationId, input);
  }

  @Get('categories')
  categories(@Req() request: TenantRequest): Promise<object[]> {
    return this.catalogue.listCategories(request.tenant.organizationId);
  }

  @Get('units')
  units(@Req() request: TenantRequest): Promise<object[]> {
    return this.catalogue.listUnits(request.tenant.organizationId);
  }

  @Get('tax-rates')
  taxRates(@Req() request: TenantRequest): Promise<object[]> {
    return this.catalogue.listTaxRates(request.tenant.organizationId);
  }
}
