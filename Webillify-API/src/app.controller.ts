import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import type { ServiceMetadata } from './app.service';

@ApiTags('meta')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Describe the API service' })
  @ApiOkResponse({ description: 'Versioned API service metadata' })
  getMetadata(): ServiceMetadata {
    return this.appService.getMetadata();
  }
}
