import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AccessService } from './access.service';

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly access: AccessService) {}

  @Get()
  @ApiOperation({
    summary: 'List active organization memberships for the current user',
  })
  list(@Req() request: AuthenticatedRequest): Promise<object[]> {
    return this.access.listOrganizations(request.identity.userId);
  }
}
