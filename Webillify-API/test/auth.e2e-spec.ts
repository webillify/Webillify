import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';

interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    fields: Array<{ path: string; code: string }>;
  };
}

interface LoginResponseBody {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

interface MeResponseBody {
  user: { email: string; displayName: string };
  memberships: Array<{ permissions: string[]; branches: unknown[] }>;
}

describe('Identity and rotating sessions', () => {
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

  afterAll(async () => app.close());

  it('returns one generic error for invalid credentials', async () => {
    const response = await request(server)
      .post('/api/v1/auth/login')
      .send({
        email: 'owner@webillify.demo',
        password: 'incorrect',
        remember: false,
      })
      .expect(401);

    const body = response.body as unknown as ErrorResponseBody;
    expect(body.error).toMatchObject({
      code: 'INVALID_CREDENTIALS',
      message: 'Email or password is incorrect.',
    });
  });

  it('logs in, sets a protected refresh cookie and returns authorized tenant context', async () => {
    const login = await loginRequest();
    const loginBody = login.body as unknown as LoginResponseBody;
    const cookie = getRefreshCookie(login.headers);

    expect(loginBody).toMatchObject({ tokenType: 'Bearer', expiresIn: 900 });
    expect(loginBody.accessToken).toEqual(expect.any(String));
    expect(cookie).toContain('webillify_refresh=');
    expect(getSetCookie(login.headers)).toContain('HttpOnly');
    expect(getSetCookie(login.headers)).toContain('SameSite=Strict');

    const me = await request(server)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(200);

    const meBody = me.body as unknown as MeResponseBody;
    expect(meBody.user).toMatchObject({
      email: 'owner@webillify.demo',
      displayName: 'PK Samy',
    });
    expect(meBody.memberships[0].permissions).toContain('subscriptions.manage');
    expect(meBody.memberships[0].permissions).toContain('ai.use');
    expect(meBody.memberships[0].branches).toHaveLength(1);

    const organizations = await request(server)
      .get('/api/v1/me/organizations')
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(200);
    expect(organizations.body).toHaveLength(1);
  });

  it('rotates refresh tokens and revokes the family when an old token is reused', async () => {
    const login = await loginRequest();
    const originalCookie = getRefreshCookie(login.headers);
    const refresh = await request(server)
      .post('/api/v1/auth/refresh')
      .set('Cookie', originalCookie)
      .expect(200);
    const refreshBody = refresh.body as unknown as LoginResponseBody;
    const replacementCookie = getRefreshCookie(refresh.headers);
    expect(replacementCookie).not.toBe(originalCookie);

    const replay = await request(server)
      .post('/api/v1/auth/refresh')
      .set('Cookie', originalCookie)
      .expect(401);
    const replayBody = replay.body as unknown as ErrorResponseBody;
    expect(replayBody.error.code).toBe('REFRESH_REUSE_DETECTED');

    await request(server)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${refreshBody.accessToken}`)
      .expect(401);

    await request(server)
      .post('/api/v1/auth/refresh')
      .set('Cookie', replacementCookie)
      .expect(401);
  });

  it('revokes the session on logout', async () => {
    const login = await loginRequest();
    const cookie = getRefreshCookie(login.headers);

    await request(server)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookie)
      .expect(204);
    await request(server)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookie)
      .expect(401);
  });

  it('rejects unknown login fields with the standard validation envelope', async () => {
    const response = await request(server)
      .post('/api/v1/auth/login')
      .send({
        email: 'owner@webillify.demo',
        password: 'webillify',
        remember: false,
        admin: true,
      })
      .expect(422);

    const body = response.body as unknown as ErrorResponseBody;
    expect(body.error).toMatchObject({ code: 'VALIDATION_FAILED' });
    expect(body.error.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'admin', code: 'whitelistValidation' }),
      ]),
    );
  });

  function loginRequest() {
    return request(server)
      .post('/api/v1/auth/login')
      .send({
        email: 'owner@webillify.demo',
        password: 'webillify',
        remember: false,
      })
      .expect(200);
  }
});

function getRefreshCookie(headers: unknown): string {
  return getSetCookie(headers).split(';')[0];
}

function getSetCookie(headers: unknown): string {
  if (!headers || typeof headers !== 'object')
    throw new Error('Response headers are missing.');
  const value = (headers as Record<string, unknown>)['set-cookie'];
  if (!Array.isArray(value) || typeof value[0] !== 'string') {
    throw new Error('Refresh cookie was not returned.');
  }
  return value[0];
}
