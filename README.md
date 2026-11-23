# NestJS 12 · Zod 4 · OpenAPI 3.2 · GraphQL · HTTP QUERY

A minimal REST + GraphQL server that uses **one set of Zod schemas** for validation, serialization and API documentation. All data is mocked by `UsersService`; there is no database or external API.

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
    users.schema.ts      # Zod models + thin GraphQL decorated types
    users.errors.ts      # domain exceptions shared by both transports
    users.module.ts
  problems/
    problem.schema.ts        # reusable RFC 9457 problem models
    api-exception.filter.ts  # HTTP problem+json vs GraphQL extensions
    api-response.decorator.ts
    input-validation.error.ts
  graphql/
    graphql-standard-schema.pipe.ts
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

The GitHub Actions workflow runs the same command on every push and pull request, on Node 24. Generated artifacts are excluded from git and regenerated on CI.

## Error handling

REST failures are `application/problem+json` with named reusable `components.schemas` ($ref) and field-level validation issues (HTTP 422). GraphQL remains GraphQL: domain exceptions become typed `errors[].extensions.code` values; bad arguments use `BAD_USER_INPUT`. The global filter checks the transport rather than responding to GraphQL exceptions with HTTP Problem Details.

## One important GraphQL distinction

NestJS GraphQL code-first still needs decorated `@ObjectType()` and `@InputType()` types to define its executable schema. They live in `users.schema.ts` alongside the Zod models. **Zod is authoritative at runtime**, but the GraphQL declarations must be kept aligned. The tests exercise both sides to catch drift.

## Customisation

The example problem type URIs use `example.test`; replace with permanent URI references belonging to your own API. The mock `create()` generates an object but does not persist it. The mock users intentionally contain `internalSecret`, which HTTP Zod serialization and GraphQL response parsing strip.

`QUERY` may need explicit proxy/WAF/CORS support outside the NestJS process.
