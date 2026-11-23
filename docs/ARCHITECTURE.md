# Design and review notes

The example demonstrates a single NestJS application exposing **REST and GraphQL** through the same mocked domain service. REST uses Zod Standard Schema; GraphQL uses its native code-first executable schema. They deliberately have separate validation contracts.

## Implementation choices

| Concern | Approach | Why |
| --- | --- | --- |
| Request validation | Native `StandardSchemaValidationPipe` with `@Body({ schema })` and `@Param(..., { schema })` | No DTO class or class-validator duplication |
| REST serialization | `StandardSchemaSerializerInterceptor` plus `SerializeOptions` | Ensures service-only fields don't leak |
| API documentation | SwaggerModule/OpenAPI 3.2 with `zod-openapi` converter | HTTP QUERY needs OpenAPI 3.2 |
| Reusable components | `schema.meta({ id })`, registered under `components.schemas` | Named `$ref` models, no anonymous response schemas |
| API reference | Scalar at `/reference` | Consumes the generated `/openapi-json` |
| GraphQL | Nest GraphQL code-first decorators | Needed for GraphQL SDL and type metadata |
| GraphQL runtime validation | Small adapter reading `~standard.validate` | Lets resolver arguments use the same Zod contracts |
| Domain errors | Framework-independent errors + transport-aware Nest filter | REST gets RFC 9457; GraphQL gets `extensions.code` |
| Client fixtures | Orval 8 + Faker from the generated spec | Detects disagreements between Zod and OpenAPI |
| CI | Node 24 + TypeScript + Oxlint + Vitest | Supports HTTP QUERY and checks source code conventions |

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

The integration suite checks real NestJS REST and GraphQL requests, HTTP QUERY, Zod sanitization, named RFC 9457 models, OpenAPI `$ref` resolution, GraphQL enum metadata, native input type validation, domain errors and GraphQL defaults. Orval generation is performed before tests, and generated Faker responses are reparsed by the canonical Zod schemas.

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
