import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { CatalogueController } from './catalogue.controller';
import { CatalogueService } from './catalogue.service';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';

@Module({
  imports: [AuthModule, AccessModule, SubscriptionsModule],
  controllers: [CatalogueController, StockController],
  providers: [CatalogueService, StockService],
  exports: [CatalogueService, StockService],
})
export class CatalogueModule {}
