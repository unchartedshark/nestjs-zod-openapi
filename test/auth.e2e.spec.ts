import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { getMigrations } from 'better-auth/db/migration';
import { AppModule } from '../src/app.module.js';
import { auth, authDatabase } from '../src/auth/auth.js';
import { configureApp } from '../src/openapi.js';

/**
 * Exercises the real Better Auth integration, not mocked request headers.
 *
 * The Better Auth database is in-memory for tests. We create two real users
 * using its HTTP signup endpoint; one receives admin role in the test store.
 * This validates session lookup, admin-plugin role checking and OpenAPI docs.
 */
describe('Better Auth admin integration', () => {
  let app: INestApplication;
  let memberCookie: string;
  let adminCookie: string;

  /**
   * Registers a user through Better Auth's mounted HTTP handler and captures
   * the session cookie returned by the library.
   */
  async function register(email: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/auth/sign-up/email')
      .send({
        name: email.split('@')[0],
        email,
        password: 'example-password-that-is-only-for-tests',
      })
      .expect(200);

    const header = response.headers['set-cookie'];
    const values = Array.isArray(header) ? header : [header];
    const cookie = values.find((item): item is string =>
      typeof item === 'string' && item.startsWith('better-auth.session_token='),
    );

    expect(cookie, 'signup should set a real Better Auth session cookie').toBeDefined();
    return cookie!.split(';')[0];
  }

  beforeAll(async () => {
    const { runMigrations } = await getMigrations(auth.options);
    await runMigrations();

    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication({ bodyParser: false });
    configureApp(app);
    await app.init();

    memberCookie = await register('member@example.test');
    adminCookie = await register('admin@example.test');

    // Admin plugin stores its system role on the Better Auth user record.
    // Explicitly grant that role in this isolated in-memory test database.
    authDatabase.prepare('UPDATE user SET role = ? WHERE email = ?')
      .run('admin', 'admin@example.test');
  });

  afterAll(async () => {
    await app?.close();
  });

  it('rejects an anonymous request with 401', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/only')
      .expect(401);

    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.body.status).toBe(401);
  });

  it('rejects an authenticated non-admin with 403', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/only')
      .set('Cookie', memberCookie)
      .expect(403);

    expect(response.body.status).toBe(403);
  });

  it('allows a real admin session', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/only')
      .set('Cookie', adminCookie)
      .expect(200);

    expect(response.body).toEqual({ message: 'Admin access granted.' });
  });

  it('documents cookie auth only on the protected operation', async () => {
    const response = await request(app.getHttpServer())
      .get('/openapi-json')
      .expect(200);

    const scheme = response.body.components.securitySchemes['better-auth.session_token'];
    expect(scheme).toEqual(expect.objectContaining({
      type: 'apiKey',
      in: 'cookie',
      name: 'better-auth.session_token',
    }));

    const protectedOperation = response.body.paths['/admin/only'].get;
    expect(protectedOperation.security).toContainEqual({
      'better-auth.session_token': [],
    });

    expect(response.body.paths['/users/{id}'].get.security).toBeUndefined();
    expect(protectedOperation.responses['401'].content['application/problem+json'])
      .toBeDefined();
    expect(protectedOperation.responses['403'].content['application/problem+json'])
      .toBeDefined();
  });
});
