import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/openapi.js';
import { UserSchema, UsersResultSchema } from '../src/users/users.schema.js';
import { UserConflictProblemSchema, UserNotFoundProblemSchema, ValidationProblemSchema } from '../src/problems/problem.schema.js';

const EXISTING = '00000000-0000-4000-8000-000000000001';
const MISSING = '00000000-0000-4000-8000-000000000099';
let app: INestApplication;
let baseUrl: string;
let document: ReturnType<typeof configureApp>;

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = mod.createNestApplication();
  document = configureApp(app);
  await app.listen(0, '127.0.0.1');
  baseUrl = await app.getUrl();
});
afterAll(async () => { await app?.close(); });

describe('HTTP & OpenAPI 3.2', () => {
  it('serves a filtered public user', async () => {
    const res = await request(app.getHttpServer()).get(`/users/${EXISTING}`).expect(200);
    expect(UserSchema.safeParse(res.body).success).toBe(true);
    expect(res.body).not.toHaveProperty('internalSecret');
  });
  it('returns the named 404 problem model', async () => {
    const res = await request(app.getHttpServer()).get(`/users/${MISSING}`).expect(404);
    expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
    expect(UserNotFoundProblemSchema.safeParse(res.body).success).toBe(true);
  });
  it('returns every input error as a named 422 problem', async () => {
    const res = await request(app.getHttpServer()).post('/users').send({ email: 'bad', displayName: '' }).expect(422);
    expect(ValidationProblemSchema.safeParse(res.body).success).toBe(true);
    expect(res.body.errors).toEqual(expect.arrayContaining([expect.objectContaining({ pointer: '#/email' })]));
  });
  it('handles user conflict through a typed problem model', async () => {
    const res = await request(app.getHttpServer()).post('/users').send({ email: 'alice@example.test', displayName: 'Duplicate' }).expect(409);
    expect(UserConflictProblemSchema.safeParse(res.body).success).toBe(true);
  });
  it('creates a synthetic user using request defaults', async () => {
    const res = await request(app.getHttpServer()).post('/users').send({ email: 'charlie@example.test', displayName: 'Charlie' }).expect(201);
    expect(UserSchema.safeParse(res.body).success).toBe(true);
    expect(res.body.role).toBe('member');
  });
  it('supports HTTP QUERY with JSON body and Zod validation', async () => {
    const response = await fetch(`${baseUrl}/users/search`, {
      method: 'QUERY', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role: 'admin', limit: 1 }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(UsersResultSchema.safeParse(body).success).toBe(true);
    expect((body as { total: number }).total).toBe(1);
  });
  it('rejects invalid QUERY criteria with RFC 9457', async () => {
    const res = await fetch(`${baseUrl}/users/search`, {
      method: 'QUERY', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ limit: -1 }),
    });
    expect(res.status).toBe(422);
    expect(res.headers.get('content-type')).toMatch(/application\/problem\+json/);
    expect(ValidationProblemSchema.safeParse(await res.json()).success).toBe(true);
  });
  it('documents QUERY, reusable component refs, and problem media types', async () => {
    const res = await request(app.getHttpServer()).get('/openapi-json').expect(200);
    expect(res.body.openapi).toBe('3.2.0');
    const methods = res.body.paths?.['/users/search'];
    expect(methods?.query?.operationId).toBe('searchUsers');
    expect(methods?.query?.requestBody?.content?.['application/json']).toBeDefined();
    expect(methods?.query?.responses?.['200']?.content?.['application/json']?.schema?.$ref).toBe('#/components/schemas/UsersResult');
    expect(methods?.query?.responses?.['422']?.content?.['application/problem+json']?.schema?.$ref).toBe('#/components/schemas/ValidationProblem');
    for (const [name, schema] of Object.entries(res.body.components.schemas as Record<string, unknown>)) {
      expect(schema, `component ${name} must be populated`).toBeTruthy();
    }
    const serialized = JSON.stringify(res.body);
    for (const match of serialized.matchAll(/"\$ref":"#\/components\/schemas\/([^"]+)"/g)) {
      expect(res.body.components.schemas[match[1]], `missing referenced model: ${match[1]}`).toBeDefined();
    }
    expect(document.paths).toBeDefined();
  });
});

describe('GraphQL on the same Nest app', () => {
  it('returns public user fields', async () => {
    const res = await request(app.getHttpServer()).post('/graphql')
      .send({ query: 'query($id: ID!) { user(id: $id) { id email displayName role } }', variables: { id: EXISTING } });
    expect(res.body.errors).toBeUndefined();
    expect(UserSchema.safeParse(res.body.data.user).success).toBe(true);
    expect(res.body.data.user).not.toHaveProperty('internalSecret');
  });
  it('provides custom domain error extensions', async () => {
    const res = await request(app.getHttpServer()).post('/graphql')
      .send({ query: 'query($id: ID!) { user(id: $id) { id } }', variables: { id: MISSING } });
    expect(res.body.errors?.[0]?.extensions).toEqual(expect.objectContaining({ code: 'USER_NOT_FOUND', httpStatus: 404 }));
  });
  it('returns the other custom GraphQL domain error', async () => {
    const res = await request(app.getHttpServer()).post('/graphql')
      .send({ query: 'mutation { createUser(input: { email: "alice@example.test", displayName: "Repeat" }) { id } }' });
    expect(res.body.errors?.[0]?.extensions?.code).toBe('USER_ALREADY_EXISTS');
    expect(res.body.errors?.[0]?.extensions?.httpStatus).toBe(409);
  });
  it('validates GraphQL arguments through the same Zod schema', async () => {
    const res = await request(app.getHttpServer()).post('/graphql')
      .send({ query: 'mutation { createUser(input: { email: "bad", displayName: "" }) { id } }' });
    expect(res.body.errors?.[0]?.extensions?.code).toBe('BAD_USER_INPUT');
    expect(res.body.errors?.[0]?.extensions?.issues).toEqual(expect.arrayContaining([expect.objectContaining({ pointer: '#/email' })]));
  });
  it('searches via the GraphQL resolver using the same service', async () => {
    const res = await request(app.getHttpServer()).post('/graphql')
      .send({ query: 'query { users(input: { role: "admin", limit: 1 }) { total users { id email role } } }' });
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.users.total).toBe(1);
  });
});
