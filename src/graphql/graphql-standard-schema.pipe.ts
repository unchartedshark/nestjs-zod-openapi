import { Injectable, PipeTransform } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import type { ZodType } from 'zod';
import { mapIssuesToPointers } from '../problems/input-validation.error.js';

/**
 * Validates GraphQL argument values with Zod's Standard Schema interface.
 *
 * Native `@Body({ schema })` belongs to HTTP; a GraphQL resolver receives its
 * arguments through `@Args()`. This pipe keeps both transport contracts on
 * the same Zod definitions and returns GraphQL-compliant validation errors.
 */
@Injectable()
export class GraphQLStandardSchemaPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  async transform(value: unknown): Promise<unknown> {
    const result = await this.schema['~standard'].validate(value);

    if (result.issues) {
      throw new GraphQLError('GraphQL input validation failed', {
        extensions: {
          code: 'BAD_USER_INPUT',
          issues: mapIssuesToPointers(result.issues),
        },
      });
    }
    return result.value;
  }
}
