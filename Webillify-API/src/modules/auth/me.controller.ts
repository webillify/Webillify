import { Controller, Get, Headers, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from './access-token.guard';
import { AuthService } from './auth.service';
import type { MeResponse } from './auth.service';
import type { AuthenticatedRequest } from './auth.types';

@ApiTags('identity')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('me')
export class MeController {
  constructor(private readonly auth: AuthService) {}

  @Get()
  @ApiOperation({
    summary: 'Return the current user and authorized tenant context',
  })
  getMe(
    @Req() request: AuthenticatedRequest,
    @Headers('x-organization-id') organizationId?: string,
  ): Promise<MeResponse> {
    return this.auth.getMe(request.identity, organizationId);
  }

  @Get('organizations')
  @ApiOperation({ summary: 'List organizations available to the current user' })
  async organizations(
    @Req() request: AuthenticatedRequest,
  ): Promise<MeResponse['memberships']> {
    return (await this.auth.getMe(request.identity)).memberships;
  }
}
