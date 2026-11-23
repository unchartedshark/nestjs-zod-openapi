import {
  StandardSchemaSerializerInterceptor,
  StandardSchemaValidationPipe,
  type INestApplication,
} from '@nestjs/common';
import { HttpAdapterHost, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { ApiExceptionFilter } from './problems/api-exception.filter.js';
import { mapIssuesToPointers, InputValidationError } from './problems/input-validation.error.js';
import { useProblemMediaType } from './problems/problem-openapi.js';

const OPENAPI_VERSION = '3.2.0';

/**
 * Builds the OpenAPI specification from the application's controllers.
 *
 * With Zod 4.2+, NestJS Swagger reads the Standard JSON Schema extension
 * provided by Zod itself. Both request decorators (such as
 * `@Body({ schema })`) and response decorators (such as
 * `@ApiOkResponse({ standardSchema })`) are discovered automatically.
 *
 * No custom converter, schema list, per-feature registration or additional
 * Zod/OpenAPI adapter is required. Named models use `z.meta({ id })`.
 *
 * @param app - The Nest application whose REST routes should be documented.
 * @returns An OpenAPI 3.2 document consumed by Scalar and Orval.
 */
export function createOpenApiDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('NestJS Standard Schema REST + GraphQL')
    .setDescription('Mocked user service, RFC 9457 errors, HTTP QUERY, and GraphQL.')
    .setVersion('1.0.0')
    .setOpenAPIVersion(OPENAPI_VERSION)
    .addCookieAuth('better-auth.session_token', {
      type: 'apiKey',
      description: 'Better Auth session cookie on local HTTP; HTTPS uses a secure cookie prefix.',
    }, 'better-auth.session_token')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  useProblemMediaType(document);
  return document;
}

/**
 * Configures production and tests identically.
 *
 * Nest handles REST Standard Schema validation and serialization. GraphQL
 * retains its own native input validation and domain error handling.
 */
export function configureApp(app: INestApplication) {
  app.useGlobalPipes(new StandardSchemaValidationPipe({
    exceptionFactory: (issues) => new InputValidationError(mapIssuesToPointers(issues)),
  }));
  app.useGlobalInterceptors(new StandardSchemaSerializerInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new ApiExceptionFilter(app.get(HttpAdapterHost)));

  const document = createOpenApiDocument(app);
  SwaggerModule.setup('openapi', app, document, { ui: false, raw: ['json'] });
  app.use('/reference', apiReference({ url: '/openapi-json' }));
  return document;
}
