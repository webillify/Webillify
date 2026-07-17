import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { TenantRequest } from './authorization.types';
import { REQUIRED_PERMISSIONS } from './require-permissions.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;
    const request = context.switchToHttp().getRequest<TenantRequest>();
    if (
      required.every((permission) =>
        request.tenant.permissions.includes(permission),
      )
    )
      return true;
    throw new ForbiddenException({
      code: 'PERMISSION_DENIED',
      message: 'Your role does not allow this action.',
    });
  }
}
