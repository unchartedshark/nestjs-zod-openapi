# NestJS 12 · Zod 4 · OpenAPI 3.2 · GraphQL · HTTP QUERY

A minimal REST + GraphQL server: **REST uses Zod Standard Schema and OpenAPI**; **GraphQL uses NestJS code-first types, native validation and custom domain errors**. Neither API requires validation from the other. All data is mocked by `UsersService`; there is no database or external API.

**Requires Node 24** (Orval 8 needs Node 22.18+).

```bash
npm install
npm run verify   # creates the OpenAPI doc, Orval client/fixtures, types, tests and JS build
npm run dev
```

Endpoints:

- Scalar: <http://localhost:3000/reference>
- SwaggerModule OpenAPI 3.2 JSON: <http://localhost:3000/openapi-json>
- GraphiQL: <http://localhost:3000/graphql>
- REST: `GET /users/:id`, `POST /users`, `QUERY /users/search`

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
  problems/
    problem.schema.ts        # reusable RFC 9457 problem models
    api-exception.filter.ts  # HTTP problem+json vs GraphQL extensions
    api-response.decorator.ts
    input-validation.error.ts
  openapi.ts             # single OpenAPI document generator + Scalar
scripts/export-openapi.ts
orval.config.ts
.github/workflows/ci.yml
```

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

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the documentation-based design rationale, Standard Schema versus GraphQL metadata boundary, error response contracts, known limitations, and testing strategy. Oxlint enforces **no nested ternary operators**.

## Customisation

The example problem type URIs use `example.test`; replace with permanent URI references belonging to your own API. The mock `create()` generates an object but does not persist it. The mock users intentionally contain `internalSecret`: REST Zod response serialization strips it, and GraphQL never exposes it because it is absent from the GraphQL object type.

`QUERY` may need explicit proxy/WAF/CORS support outside the NestJS process.
