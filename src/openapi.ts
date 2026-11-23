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

/** Generates the very same OpenAPI document used by Scalar, Orval and tests. */
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

  // Explicit named output components. Avoid anonymous inline response models.
  // Inputs are also explicitly registered to check downstream $ref resolution.
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

/** Configures production and test apps identically. */
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
