import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';

interface LoginBody {
  accessToken: string;
}

interface ErrorBody {
  error: { code: string };
}

describe('Tenant, branch and permission authorization matrix', () => {
  const prisma = new PrismaClient();
  const organizationId = '20000000-0000-4000-8000-000000000001';
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
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('lists only organizations belonging to the authenticated user', async () => {
    const token = await login('owner@webillify.demo');
    const response = await request(server)
      .get('/api/v1/organizations')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toHaveLength(1);
  });

  it('requires explicit tenant context and allows the assigned owner branch', async () => {
    const token = await login('owner@webillify.demo');
    const missing = await request(server)
      .get('/api/v1/branches')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
    expect((missing.body as unknown as ErrorBody).error.code).toBe(
      'ORGANIZATION_REQUIRED',
    );

    const branches = await request(server)
      .get('/api/v1/branches')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(branches.body).toHaveLength(1);
  });

  it('does not disclose another organization or an unassigned same-tenant branch', async () => {
    const token = await login('owner@webillify.demo');
    const company = await prisma.company.findFirstOrThrow({
      where: { organizationId },
    });
    const otherOrganization = await prisma.organization.create({
      data: {
        name: 'Authorization Matrix Tenant',
        slug: `authz-${randomUUID()}`,
      },
    });
    const otherBranch = await prisma.branch.create({
      data: {
        organizationId,
        companyId: company.id,
        name: 'Unassigned Test Branch',
        normalizedCode: `UNASSIGNED-${randomUUID().slice(0, 24)}`,
      },
    });

    try {
      const tenantResponse = await request(server)
        .get('/api/v1/branches')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', otherOrganization.id)
        .expect(404);
      expect((tenantResponse.body as unknown as ErrorBody).error.code).toBe(
        'ORGANIZATION_NOT_FOUND',
      );

      const branchResponse = await request(server)
        .get(`/api/v1/branches/${otherBranch.id}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', organizationId)
        .expect(404);
      expect((branchResponse.body as unknown as ErrorBody).error.code).toBe(
        'BRANCH_NOT_FOUND',
      );
    } finally {
      await prisma.branch.delete({ where: { id: otherBranch.id } });
      await prisma.organization.delete({ where: { id: otherOrganization.id } });
    }
  });

  it('denies a valid tenant member who lacks the required permission', async () => {
    const token = await login('cashier@webillify.demo');
    const response = await request(server)
      .get('/api/v1/branches')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .expect(403);

    expect((response.body as unknown as ErrorBody).error.code).toBe(
      'PERMISSION_DENIED',
    );
  });

  async function login(email: string): Promise<string> {
    const response = await request(server)
      .post('/api/v1/auth/login')
      .send({ email, password: 'webillify', remember: false })
      .expect(200);
    return (response.body as unknown as LoginBody).accessToken;
  }
});
