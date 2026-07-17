import { Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicatorResult } from '@nestjs/terminus';
import { PrismaService } from './prisma.service';

@Injectable()
export class DatabaseHealthIndicator {
  constructor(private readonly prisma: PrismaService) {}

  async isHealthy(key = 'database'): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.ping();
      return { [key]: { status: 'up' } };
    } catch {
      throw new HealthCheckError('Database is not ready', {
        [key]: { status: 'down' },
      });
    }
  }
}
