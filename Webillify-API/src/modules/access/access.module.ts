import { Module } from '@nestjs/common';
import { PermissionGuard } from '../../core/authorization/permission.guard';
import { TenantAccessGuard } from '../../core/authorization/tenant-access.guard';
import { AuthModule } from '../auth/auth.module';
import { AccessController } from './access.controller';
import { AccessService } from './access.service';
import { OrganizationsController } from './organizations.controller';

@Module({
  imports: [AuthModule],
  controllers: [AccessController, OrganizationsController],
  providers: [AccessService, TenantAccessGuard, PermissionGuard],
})
export class AccessModule {}
