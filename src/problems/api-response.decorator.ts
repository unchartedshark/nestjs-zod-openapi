import { applyDecorators, SerializeOptions } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import type { ZodType } from 'zod';

function componentRef(schema: ZodType) {
  const id = schema.meta()?.id;
  if (!id) throw new Error('All public response models must have a Zod .meta({ id })');
  return { $ref: `#/components/schemas/${id}` };
}

export function ApiZodResponse(status: number, schema: ZodType, description = 'Success') {
  return applyDecorators(
    SerializeOptions({ schema }),
    ApiResponse({ status, description, content: { 'application/json': { schema: componentRef(schema) } } }),
  );
}

export function ApiProblem(status: number, schema: ZodType, description: string) {
  return ApiResponse({
    status, description,
    content: { 'application/problem+json': { schema: componentRef(schema) } },
  });
}
