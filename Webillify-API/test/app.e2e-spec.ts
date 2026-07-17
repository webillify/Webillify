import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';

describe('Webillify API foundation', () => {
  let app: INestApplication;
  let server: Parameters<typeof request>[0];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app, { swagger: false });
    await app.init();
    server = app.getHttpServer() as Parameters<typeof request>[0];
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves versioned metadata with secure headers', async () => {
    const response = await request(server).get('/api/v1').expect(200);

    expect(response.body).toEqual({
      name: 'Webillify API',
      version: 'v1',
      status: 'operational',
    });
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-correlation-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('serves liveness and readiness checks', async () => {
    const live = await request(server).get('/api/v1/health').expect(200);
    const ready = await request(server).get('/api/v1/health/ready').expect(200);

    expect(live.body).toMatchObject({ status: 'ok' });
    expect(ready.body).toMatchObject({ status: 'ok' });
  });

  it('preserves a valid correlation ID', async () => {
    const correlationId = '123e4567-e89b-42d3-a456-426614174000';
    const response = await request(server)
      .get('/api/v1')
      .set('X-Correlation-Id', correlationId)
      .expect(200);

    expect(response.headers['x-correlation-id']).toBe(correlationId);
  });

  it('returns the stable API error envelope', async () => {
    const response = await request(server).get('/api/v1/not-found').expect(404);

    expect(response.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Cannot GET /api/v1/not-found',
        fields: [],
        correlationId: response.headers['x-correlation-id'],
      },
    });
  });
});
