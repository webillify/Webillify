import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionGuard } from '../../core/authorization/permission.guard';
import { RequirePermissions } from '../../core/authorization/require-permissions.decorator';
import { TenantAccessGuard } from '../../core/authorization/tenant-access.guard';
import type { TenantRequest } from '../../core/authorization/authorization.types';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AccessService } from './access.service';

@ApiTags('organization access')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, TenantAccessGuard, PermissionGuard)
@RequirePermissions('settings.manage')
@Controller()
export class AccessController {
  constructor(private readonly access: AccessService) {}

  @Get('branches')
  @ApiOperation({
    summary: 'List branches explicitly assigned to the current membership',
  })
  branches(@Req() request: TenantRequest): Promise<object[]> {
    return this.access.listBranches(request.tenant);
  }

  @Get('branches/:id')
  @ApiOperation({
    summary: 'Get one assigned branch without cross-tenant disclosure',
  })
  branch(
    @Req() request: TenantRequest,
    @Param('id') id: string,
  ): Promise<object> {
    return this.access.getBranch(request.tenant, id);
  }

  @Get('roles')
  roles(@Req() request: TenantRequest): Promise<object[]> {
    return this.access.listRoles(request.tenant);
  }

  @Get('permissions')
  permissions(): Promise<object[]> {
    return this.access.listPermissions();
  }
}
