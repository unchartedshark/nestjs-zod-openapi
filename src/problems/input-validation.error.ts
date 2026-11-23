import { HttpException } from '@nestjs/common';
import type { ValidationIssue } from './problem.schema.js';

/**
 * A request failed Zod Standard Schema validation.
 *
 * HTTP validation uses 422 so clients can distinguish invalid input from
 * malformed HTTP requests. The REST filter renders the complete issue list.
 */
export class InputValidationError extends HttpException {
  constructor(public readonly issues: ValidationIssue[]) {
    super('Validation failed', 422);
  }
}

type StandardIssue = {
  readonly message: string;
  readonly path?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }>;
};

/**
 * Converts Standard Schema issue paths into JSON Pointer fragments.
 *
 * Escapes `~` and `/` according to RFC 6901. The pointer is relative to the
 * validated argument (e.g. request body or a GraphQL input object), not
 * necessarily the complete HTTP request.
 *
 * @param issues - Issues returned by a Standard Schema-compliant validator.
 * @returns The stable, documented validation issue extension.
 */
export function mapIssuesToPointers(issues: readonly StandardIssue[]): ValidationIssue[] {
  return issues.map((issue) => {
    const segments = issue.path ?? [];
    const pointer = segments.map((segment) => {
      const key = typeof segment === 'object' ? segment.key : segment;
      return String(key).replace(/~/g, '~0').replace(/\//g, '~1');
    });

    return {
      pointer: pointer.length ? `#/${pointer.join('/')}` : '#',
      detail: issue.message,
    };
  });
}
