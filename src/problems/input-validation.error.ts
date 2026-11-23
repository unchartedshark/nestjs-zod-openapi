import { HttpException } from '@nestjs/common';
import type { ValidationIssue } from './problem.schema.js';

export class InputValidationError extends HttpException {
  constructor(public readonly issues: ValidationIssue[]) {
    super('Validation failed', 422);
  }
}

export function mapIssuesToPointers(issues: readonly { path?: readonly (PropertyKey | { key: PropertyKey })[]; message: string }[]): ValidationIssue[] {
  return issues.map((issue) => ({
    pointer: '#' + (issue.path ?? []).map((segment) => {
      const key = typeof segment === 'object' ? segment.key : segment;
      return '/' + String(key).replace(/~/g, '~0').replace(/\//g, '~1');
    }).join(''),
    detail: issue.message,
  }));
}
