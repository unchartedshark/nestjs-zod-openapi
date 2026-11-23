import { StandardSchemaSerializerInterceptor, StandardSchemaValidationPipe, type INestApplication } from '@nestjs/common';
import { HttpAdapterHost, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule, type SwaggerDocumentOptions } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { createSchema } from 'zod-openapi';
import type { ZodType } from 'zod';
import { ApiExceptionFilter } from './problems/api-exception.filter.js';
import { mapIssuesToPointers } from './problems/input-validation.error.js';
import { InputValidationError } from './problems/input-validation.error.js';
import { documentedSchemas } from './problems/problem.schema.js';
import { CreateUserSchema, SearchUsersSchema, UserSchema, UsersResultSchema } from './users/users.schema.js';

const OPENAPI_VERSION = '3.2.0';

/**
 * Generates the one OpenAPI 3.2 document used by Scalar, Orval and tests.
 *
 * Swagger discovers HTTP routes; `zod-openapi` converts Zod Standard Schema
 * metadata into the input/output constraints. Explicitly registering named
 * components allows every response decorator to reference the same model.
 *
 * @param app - The Nest application containing REST controllers.
 * @returns A complete OpenAPI document including HTTP QUERY operations.
 */
export function createOpenApiDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('NestJS Standard Schema REST + GraphQL')
    .setDescription('Mocked user service, RFC 9457 errors, HTTP QUERY, and GraphQL.')
    .setVersion('1.0.0')
    .setOpenAPIVersion(OPENAPI_VERSION)
    .build();

  const options: SwaggerDocumentOptions = {
    standardSchemaConverter: (schema, { schemaType }) => {
      if (typeof schema !== 'object' || !schema || !('~standard' in schema) ||
          (schema as { '~standard'?: { vendor?: string } })['~standard']?.vendor !== 'zod') return undefined;
      const result = createSchema(schema as ZodType, {
        io: schemaType,
        openapiVersion: OPENAPI_VERSION,
      });
      return { schema: result.schema, components: result.components };
    },
  };

  const document = SwaggerModule.createDocument(app, config, options);
  document.components ??= {};
  document.components.schemas ??= {};

  // Register both inputs and outputs by name; the $refs in the response
  // decorators must always resolve, including application/problem+json.
  const schemas = [UserSchema, UsersResultSchema, CreateUserSchema, SearchUsersSchema, ...documentedSchemas];
  for (const schema of schemas) {
    const { components } = createSchema(schema, {
      io: schema === CreateUserSchema || schema === SearchUsersSchema ? 'input' : 'output',
      openapiVersion: OPENAPI_VERSION,
    });
    Object.assign(document.components.schemas, components);
  }
  return document;
}

/**
 * Registers runtime validators, transport-aware errors, documentation, and UI.
 *
 * Production and tests use this exact entrypoint so integration tests exercise
 * the same pipes/interceptors/filters and schema configuration.
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
