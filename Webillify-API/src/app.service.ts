import { Injectable } from '@nestjs/common';

export interface ServiceMetadata {
  readonly name: 'Webillify API';
  readonly version: 'v1';
  readonly status: 'operational';
}

@Injectable()
export class AppService {
  getMetadata(): ServiceMetadata {
    return { name: 'Webillify API', version: 'v1', status: 'operational' };
  }
}
