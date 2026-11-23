import { applyDecorators, SerializeOptions } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import type { ZodType } from 'zod';

/** Produces an OpenAPI component reference from Zod's registered model ID. */
function componentRef(schema: ZodType): { $ref: string } {
  const id = schema.meta()?.id;
  if (!id) {
    throw new Error('Public API schemas must declare .meta({ id: "ModelName" })');
  }
  return { $ref: `#/components/schemas/${id}` };
}

/**
 * Documents and serializes an HTTP success response using the same Zod schema.
 *
 * The `SerializeOptions` metadata is consumed by Nest's global Standard
 * Schema serializer interceptor. No class-transformer DTO is required.
 */
export function ApiZodResponse(status: number, schema: ZodType, description = 'Success') {
  return applyDecorators(
    SerializeOptions({ schema }),
    ApiResponse({
      status,
      description,
      content: { 'application/json': { schema: componentRef(schema) } },
    }),
  );
}

/**
 * Documents an RFC 9457 error response as a named component, not an inline DTO.
 *
 * Swagger decorators only declare the contract: the global exception filter
 * actually sends `application/problem+json` at runtime.
 */
export function ApiProblem(status: number, schema: ZodType, description: string) {
  return ApiResponse({
    status,
    description,
    content: { 'application/problem+json': { schema: componentRef(schema) } },
  });
}
