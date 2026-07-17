import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    controller = module.get(AppController);
  });

  it('describes the versioned service', () => {
    expect(controller.getMetadata()).toEqual({
      name: 'Webillify API',
      version: 'v1',
      status: 'operational',
    });
  });
});
