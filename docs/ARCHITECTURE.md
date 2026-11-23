# Design and review notes

The example demonstrates a single NestJS application exposing **REST and GraphQL** through the same mocked domain service. REST uses Zod Standard Schema; GraphQL uses its native code-first executable schema. They deliberately have separate validation contracts.

## Implementation choices

| Concern | Approach | Why |
| --- | --- | --- |
| Request validation | Native `StandardSchemaValidationPipe` with `@Body({ schema })` and `@Param(..., { schema })` | No DTO class or class-validator duplication |
| REST serialization | `StandardSchemaSerializerInterceptor` plus `SerializeOptions` | Ensures service-only fields don't leak |
| API documentation | SwaggerModule/OpenAPI 3.2 with Zod's native Standard JSON Schema extension | HTTP QUERY needs OpenAPI 3.2 |
| Reusable components | `schema.meta({ id })` + `@ApiResponse({ standardSchema })` | Swagger discovers and registers named `$ref` components; no central list |
| API reference | Scalar at `/reference` | Consumes the generated `/openapi-json` |
| GraphQL | Nest GraphQL code-first decorators | Needed for GraphQL SDL and type metadata |
| Authentication | Community `@thallesp/nestjs-better-auth`, Better Auth admin plugin and real SQLite sessions | Native Nest guards and `@Roles(['admin'])`; no custom authentication code |
| OpenAPI auth | `@ApiCookieAuth()` + `DocumentBuilder.addCookieAuth()` | Security requirements are declared only on the protected operation |
| Domain errors | Framework-independent errors + transport-aware Nest filter | REST gets RFC 9457; GraphQL gets `extensions.code` |
| Client fixtures | Orval 8 + Faker from the generated spec | Detects disagreements between Zod and OpenAPI |
| CI | Node 24 + TypeScript + Oxlint + Vitest | Supports HTTP QUERY and checks source code conventions |

## The NestJS controller decorator contract

Swagger discovers request schemas from `@Body({ schema })`, `@Param(..., { schema })`
and related Nest decorators. Responses use Nest's documented
`@ApiOkResponse({ standardSchema: ModelSchema })` (or the status-specific
alternative) plus `@SerializeOptions({ schema: ModelSchema })` for HTTP runtime
serialization. Zod 4.2+ implements the Standard JSON Schema extension, so
NestJS Swagger converts the schemas automatically with **no custom converter**.
Named definitions are merged into OpenAPI `components.schemas`.

**No feature imports, manual component registration, model arrays, or
schema-by-schema changes to `openapi.ts`, or a `zod-openapi` dependency.** New controllers are added to their
feature modules as usual. An integration-test-only controller deliberately adds
two new named models and verifies the OpenAPI document discovers them.

The global REST exception filter always returns RFC 9457 Problem Details for
HTTP 4xx/5xx responses. Swagger's Standard Schema response integration defaults
the media type to `application/json`, regardless of the response status. The
single generic `useProblemMediaType` step aligns all generated HTTP error
responses to `application/problem+json`. It does **not** register or enumerate
any schemas and needs no edits when new endpoints or errors are introduced.

## Admin-only authentication

Better Auth's admin plugin provides the persistent `user.role` field.
`@thallesp/nestjs-better-auth` supplies the Nest `AuthGuard` and
`@Roles(['admin'])` decorator; we do not duplicate them. The guard is
global by default, while the existing mock demo controllers and resolvers
are deliberately `@AllowAnonymous()`. New routes default to secure.

The admin-only REST operation advertises a cookie-based security requirement
via `@ApiCookieAuth()` and the one-time
`DocumentBuilder.addCookieAuth('better-auth.session_token')` setting.
The guard, not the OpenAPI description, enforces security.
Better Auth's `/api/auth/*` routes are mounted by the library and aren't
automatically included as ordinary Nest controller operations.

Only Better Auth uses SQLite. Its migrations are run explicitly through
`npm run auth:migrate`, not on each app bootstrap. Tests use ephemeral SQLite
and exercise actual session cookies and user roles.

## Separation of REST and GraphQL schemas

`users.schema.ts` defines Zod contracts used by REST request validation, response serialization, OpenAPI and Orval. `users.graphql.ts` defines NestJS code-first types and defaults; it has no Zod runtime dependency or custom argument-validation pipe. The role values live in `users.types.ts` and feed the REST enum and GraphQL enum independently.

GraphQL validates its declared types: missing required fields, invalid enum members and incompatible scalar values are rejected natively. It **does not** perform Zod-specific constraints such as email-format validation or UUID refinements. Those are specific to the REST API in this sample. Domain errors thrown by the mocked service remain shared across transports.

GraphQL response fields are constrained by its object type and the selection set; HTTP response sanitization is handled by Nest's Standard Schema serializer.

## Why there are two TypeScript configurations

Production builds use `NodeNext` so emitted ESM imports include their `.js` extensions. Orval's generated client currently uses **extensionless imports**, which are legal for bundlers but not NodeNext. The separate `tsconfig.typecheck.json` uses `moduleResolution: Bundler` strictly for full-project typechecking; it does not change the production build.

`tsx` does not emit the TypeScript decorator metadata required by NestJS GraphQL code-first. For that reason OpenAPI export compiles the server with `tsc` and runs the generated JavaScript. Vitest uses SWC's decorator metadata handling.

## Error semantics

REST responses follow [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) and use `application/problem+json`. The validation extension contains JSON Pointer fragments relative to the validated input. We deliberately use HTTP 422 for schema validation; HTTP method and JSON syntax errors may use different statuses.

GraphQL errors are not HTTP Problem Details. GraphQL domain failures include `errors[].extensions.code` (and demonstration-only HTTP status/type extensions). GraphQL schema validation uses its native `GRAPHQL_VALIDATION_FAILED` error code; no custom argument-validation pipe is installed. Both transports use the same underlying domain errors.

The `https://example.test/problems/...` values are placeholder *identifiers*, not hosted documentation. Real deployments should publish permanent problem type documentation at their own stable URLs.

## Test boundaries

The integration suite checks real NestJS REST and GraphQL requests, HTTP QUERY, Zod sanitization, named RFC 9457 models, automatic controller-driven OpenAPI `$ref` resolution, GraphQL enum metadata, native input type validation, domain errors and GraphQL defaults. Orval generation is performed before tests, and generated Faker responses are reparsed by the canonical Zod schemas.

**Not claimed:** live browser UI testing of Scalar, support of HTTP QUERY across every CDN/proxy, or production database semantics. The example is intentionally service-only.

A committed `package-lock.json` and `npm ci` in GitHub Actions make dependency resolution reproducible; update both `package.json` and the lockfile when changing dependencies.

## References

- [NestJS Standard Schema validation](https://docs.nestjs.com/pipes)
- [NestJS Swagger/OpenAPI](https://docs.nestjs.com/openapi/introduction)
- [NestJS GraphQL code-first enums](https://docs.nestjs.com/graphql/unions-and-enums)
- [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457)
- [OpenAPI specification](https://spec.openapis.org/oas/latest.html)
- [Scalar NestJS integration](https://guides.scalar.com/scalar/scalar-api-references/integrations/nestjs)
- [Orval](https://orval.dev/)
- [Oxlint](https://oxc.rs/docs/guide/usage/linter/quickstart.html)
