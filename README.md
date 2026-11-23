# NestJS 12 · Zod 4 · OpenAPI 3.2 · GraphQL · HTTP QUERY

A minimal REST + GraphQL server: **REST uses Zod Standard Schema and OpenAPI**; **GraphQL uses NestJS code-first types, native validation and custom domain errors**. Neither API requires validation from the other. The example user records are mocked. Better Auth uses a small local SQLite database for actual sessions and its admin plugin.

**Requires Node 24** (Orval 8 needs Node 22.18+).

```bash
npm install
export BETTER_AUTH_SECRET="$(openssl rand -hex 32)"
npm run auth:migrate
npm run verify   # creates the OpenAPI doc, Orval client/fixtures, types, tests and JS build
npm run dev
```

Endpoints:

- Scalar: <http://localhost:3000/reference>
- SwaggerModule OpenAPI 3.2 JSON: <http://localhost:3000/openapi-json>
- GraphiQL: <http://localhost:3000/graphql>
- REST: `GET /users/:id`, `POST /users`, `QUERY /users/search`
- Better Auth: `/api/auth/*` (email/password sign-in and session cookies)
- Admin-only REST: `GET /admin/only`

```bash
curl -sS http://localhost:3000/users/00000000-0000-4000-8000-000000000001
curl -sS -X QUERY http://localhost:3000/users/search \
  -H 'Content-Type: application/json' -d '{"role":"admin","limit":1}'
curl -sS -X POST http://localhost:3000/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ users(input: { limit: 1 }) { total users { id email } } }"}'
```

## Layout

```text
src/
  users/
    users.controller.ts  # REST GET, POST, RFC 10008 QUERY
    users.resolver.ts    # GraphQL queries and mutation
    users.service.ts     # static mock data and domain errors
    users.schema.ts      # Zod contracts for REST and OpenAPI\n    users.graphql.ts     # Native NestJS code-first GraphQL types\n    users.types.ts       # Framework-neutral role values
    users.errors.ts      # domain exceptions shared by both transports
    users.module.ts
  auth/
    auth.ts             # Better Auth, admin plugin and SQLite session store
    admin.controller.ts # @Roles(['admin']) with Nest's auth guard
  problems/
    problem.schema.ts        # reusable RFC 9457 problem models
    api-exception.filter.ts  # HTTP problem+json vs GraphQL extensions
    problem-openapi.ts      # generic RFC 9457 response media mapping
    input-validation.error.ts
  openapi.ts             # single OpenAPI document generator + Scalar
scripts/export-openapi.ts
scripts/migrate-auth.ts
orval.config.ts
.github/workflows/ci.yml
```

## Minimal Better Auth admin-only route

The community-supported `@thallesp/nestjs-better-auth` module mounts
Better Auth at `/api/auth/*`. The global guard is deliberately disabled in this minimal example; only the
admin endpoint applies `@UseGuards(AuthGuard)`. Existing REST and GraphQL
examples remain unchanged and public. The admin controller uses
`@Roles(['admin'])`, which checks Better Auth's admin-plugin system role.

```ts
@Get('only')
@Roles(['admin'])
@ApiCookieAuth()
only() {
  return { message: 'Admin access granted.' };
}
```

The OpenAPI document defines the **Better Auth session cookie** security scheme,
and only the protected admin operation requires it. This is *cookie/session*
authentication, not an invented JWT bearer token. Swagger/OpenAPI describes
authentication, while the NestJS integration actually enforces it.

For local development, `auth.sqlite` is a real but disposable auth database
(the mocked user service needs no database). Run `npm run auth:migrate` before
starting the server. Set `BETTER_AUTH_URL` when not using
`http://localhost:3000` and supply a strong, unique `BETTER_AUTH_SECRET`.
Both environment variables are mandatory considerations for deployment.

Create your first administrator using Better Auth's CLI after migrating the
schema (it prompts for the password):

```sh
npx auth@latest create-admin --config ./src/auth/auth.ts \
  --email admin@example.com --name Admin --role admin
```

The admin plugin defaults normal accounts to role `user`. **Do not treat the
mock service's `member` role as an authentication role.** The test suite verifies actual sessions against the in-memory SQLite auth store,
including unauthenticated (401), non-admin (403) and admin (200) access.

This example uses a local HTTP cookie called `better-auth.session_token`.
For HTTPS, Better Auth applies the secure cookie prefix; configure OpenAPI's
cookie name to match your production Better Auth cookie settings.

## Adding another REST endpoint

**No central registration is needed.** Define a Zod schema with a name, then use
Nest's documented Standard Schema and Swagger response decorators:

```ts
export const CreateThingSchema = z.object({
  label: z.string().min(1),
}).meta({ id: 'CreateThing' });

export const ThingSchema = z.object({
  id: z.uuid(),
  label: z.string(),
}).meta({ id: 'Thing' });

@Post()
@ApiCreatedResponse({ standardSchema: ThingSchema })
@SerializeOptions({ schema: ThingSchema })
create(@Body({ schema: CreateThingSchema }) body: z.output<typeof CreateThingSchema>) {
  return this.service.create(body);
}
```

Zod 4.2+ provides native Standard JSON Schema metadata. NestJS Swagger
converts the request and response models from these decorators without
`zod-openapi`, a custom converter, or a schema registry. It hoists named
definitions into `components.schemas`. Add your controller
to its Nest module as usual; **do not edit `openapi.ts`**. The integration suite
registers a test-only controller to prove this contract.

For HTTP errors, use the normal `@ApiNotFoundResponse({ standardSchema: ... })`
(or other status decorator). The application's global RFC 9457 filter returns
`application/problem+json`; its one-time OpenAPI media-type normalizer reflects
that behavior for all error statuses. No error-model registry is maintained.

## Tests and generation

`npm run verify`:

1. Uses the **actual NestJS SwaggerModule** to export `openapi.json` (OpenAPI **3.2**, including `query:` operations).
2. Runs **Orval >=8.24** against that spec to generate a Fetch client, TypeScript models and Faker fixtures into `src/generated/`.
3. Typechecks the complete project, including generated code.
4. Runs Vitest service, REST, GraphQL and OpenAPI contract tests. The generated faker fixtures are parsed back through the original Zod response models.
5. Compiles the NestJS app with `tsc`.

GitHub Actions runs the same generation, Oxlint, TypeScript, Vitest, and build steps on every push and pull request, on Node 24. Generated artifacts are excluded from git and regenerated on CI.

## Error handling

REST failures are `application/problem+json` with named reusable `components.schemas` ($ref) and field-level validation issues (HTTP 422). GraphQL remains GraphQL: domain exceptions become typed `errors[].extensions.code` values; invalid field types, missing required fields, and bad enum values are handled by GraphQL itself (`GRAPHQL_VALIDATION_FAILED`). The global filter checks the transport rather than responding to GraphQL exceptions with HTTP Problem Details.

## GraphQL is deliberately independent of Zod

NestJS GraphQL code-first uses `@ObjectType()`, `@InputType()`, and `@Field()` in `users.graphql.ts`. Its own executable schema validates GraphQL arguments, applies defaults, and selects public response fields. There is **no GraphQL Standard Schema pipe**, and resolvers do not call `UserSchema.parse()`.

The domain service and user-role values are shared, but GraphQL does not inherit REST-only Zod refinements such as email format or UUID structure. These are separate transport contracts by design. The tests verify native GraphQL input validation, defaults, enum handling, and custom domain errors.

## Architecture and code review

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the documented NestJS controller-decorator pattern, protocol separation, generic RFC 9457 media mapping, known limitations, and testing strategy. Oxlint enforces **no nested ternary operators**.

## Customisation

The example problem type URIs use `example.test`; replace with permanent URI references belonging to your own API. The mock `create()` generates an object but does not persist it. The mock users intentionally contain `internalSecret`: REST Zod response serialization strips it, and GraphQL never exposes it because it is absent from the GraphQL object type.

`QUERY` may need explicit proxy/WAF/CORS support outside the NestJS process.
