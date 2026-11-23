import { Injectable, PipeTransform } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import type { ZodType } from 'zod';
import { mapIssuesToPointers } from '../problems/input-validation.error.js';

/** GraphQL Args does not accept HTTP's @Body({schema}); use Zod's Standard Schema interface. */
@Injectable()
export class GraphQLStandardSchemaPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  async transform(value: unknown): Promise<unknown> {
    const result = await this.schema['~standard'].validate(value);
    if (result.issues) {
      throw new GraphQLError('GraphQL input validation failed', {
        extensions: { code: 'BAD_USER_INPUT', issues: mapIssuesToPointers(result.issues) },
      });
    }
    return result.value;
  }
}
