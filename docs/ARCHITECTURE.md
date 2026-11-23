# Design and review notes

The example intentionally demonstrates a single NestJS process exposing **REST and GraphQL** with one mocked domain service. All validation schemas live in `*.schema.ts`; HTTP OpenAPI and GraphQL are **separate contracts** backed by the same Zod parsing rules.

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

## What is intentionally not generated from Zod

NestJS code-first GraphQL currently requires `@ObjectType`, `@InputType`, `@Field`, etc. in order to build an executable GraphQL schema. Those **metadata classes aren't validation DTOs** and must remain synchronized with the Zod schemas.

A Zod enum provides both the input/output runtime validation and the enum values registered with GraphQL; the SDL is tested using introspection to detect type drift.

## Why there are two TypeScript configurations

Production builds use `NodeNext` so emitted ESM imports include their `.js` extensions. Orval's generated client currently uses **extensionless imports**, which are legal for bundlers but not NodeNext. The separate `tsconfig.typecheck.json` uses `moduleResolution: Bundler` strictly for full-project typechecking; it does not change the production build.

`tsx` does not emit the TypeScript decorator metadata required by NestJS GraphQL code-first. For that reason OpenAPI export compiles the server with `tsc` and runs the generated JavaScript. Vitest uses SWC's decorator metadata handling.

## Error semantics

REST responses follow [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) and use `application/problem+json`. The validation extension contains JSON Pointer fragments relative to the validated input. We deliberately use HTTP 422 for schema validation; HTTP method and JSON syntax errors may use different statuses.

GraphQL errors are not HTTP Problem Details. GraphQL domain failures include `errors[].extensions.code` (and demonstration-only HTTP status/type extensions). GraphQL argument validation uses `BAD_USER_INPUT`. Both use the same underlying domain errors.

The `https://example.test/problems/...` values are placeholder *identifiers*, not hosted documentation. Real deployments should publish permanent problem type documentation at their own stable URLs.

## Test boundaries

The integration suite checks real NestJS REST and GraphQL requests, HTTP QUERY, Zod sanitization, named RFC 9457 models, OpenAPI `$ref` resolution, GraphQL enum metadata, domain errors and validation errors. Orval generation is performed before tests, and generated Faker responses are reparsed by the canonical Zod schemas.

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
