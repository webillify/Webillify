import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { ApiEnvironment } from '../../config/environment';
import { AuthService, REFRESH_COOKIE } from './auth.service';
import type { CookieRequest } from './auth.types';
import { LoginDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<ApiEnvironment, true>,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Authenticate and begin a rotating session' })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Ip() ipAddress: string,
  ): Promise<object> {
    const result = await this.auth.login(dto, {
      ipAddress,
      userAgent: request.header('user-agent'),
    });
    this.setRefreshCookie(
      response,
      result.refreshToken,
      result.refreshExpiresAt,
    );
    return result.response;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Rotate a refresh token and issue a new access token',
  })
  async refresh(
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<object> {
    const result = await this.auth.refresh(request.cookies[REFRESH_COOKIE]);
    this.setRefreshCookie(
      response,
      result.refreshToken,
      result.refreshExpiresAt,
    );
    return result.response;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke the current refresh-token family' })
  async logout(
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.logout(request.cookies[REFRESH_COOKIE]);
    response.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }

  private setRefreshCookie(
    response: Response,
    value: string,
    expires: Date,
  ): void {
    response.cookie(REFRESH_COOKIE, value, {
      ...this.cookieOptions(),
      expires,
    });
  }

  private cookieOptions(): {
    httpOnly: true;
    secure: boolean;
    sameSite: 'strict';
    path: string;
  } {
    return {
      httpOnly: true,
      secure: this.config.get('NODE_ENV', { infer: true }) === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth',
    };
  }
}
