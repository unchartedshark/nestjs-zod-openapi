import {
  StandardSchemaSerializerInterceptor,
  StandardSchemaValidationPipe,
  type INestApplication,
} from '@nestjs/common';
import { HttpAdapterHost, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule, type SwaggerDocumentOptions } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { createSchema } from 'zod-openapi';
import type { ZodType } from 'zod';
import { ApiExceptionFilter } from './problems/api-exception.filter.js';
import { mapIssuesToPointers, InputValidationError } from './problems/input-validation.error.js';
import { useProblemMediaType } from './problems/problem-openapi.js';

const OPENAPI_VERSION = '3.2.0';

/** Narrow a generic Standard Schema to Zod for the shared Swagger converter. */
function isZodSchema(schema: unknown): schema is ZodType {
  if (!schema || typeof schema !== 'object' || !('~standard' in schema)) {
    return false;
  }
  const standard = schema as { '~standard'?: { vendor?: string } };
  return standard['~standard']?.vendor === 'zod';
}

/**
 * Builds a document from the application's controllers, not a model registry.
 *
 * Nest's Swagger explorer discovers schemas from `@Body({ schema })`,
 * `@Param(..., { schema })`, and `@ApiResponse({ standardSchema })`.
 * `zod-openapi` returns named components that Nest merges automatically.
 * No feature or schema needs to be imported or listed here.
 *
 * @param app - The application whose controllers should be documented.
 * @returns The OpenAPI 3.2 document consumed by Scalar and Orval.
 */
export function createOpenApiDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('NestJS Standard Schema REST + GraphQL')
    .setDescription('Mocked user service, RFC 9457 errors, HTTP QUERY, and GraphQL.')
    .setVersion('1.0.0')
    .setOpenAPIVersion(OPENAPI_VERSION)
    .build();

  const options: SwaggerDocumentOptions = {
    standardSchemaConverter(schema, { schemaType }) {
      if (!isZodSchema(schema)) {
        return undefined;
      }

      const converted = createSchema(schema, {
        io: schemaType,
        openapiVersion: OPENAPI_VERSION,
      });
      return { schema: converted.schema, components: converted.components };
    },
  };

  const document = SwaggerModule.createDocument(app, config, options);
  useProblemMediaType(document);
  return document;
}

/**
 * Configures production and tests identically.
 *
 * REST uses Nest's Standard Schema validation/serialization; GraphQL keeps
 * native GraphQL validation and the shared domain-error exception filter.
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
