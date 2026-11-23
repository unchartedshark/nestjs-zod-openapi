import 'zod-openapi';
import { z } from 'zod';

export const VALIDATION_PROBLEM_TYPE = 'https://example.test/problems/validation';

const BaseProblem = z.object({
  type: z.string().meta({ description: 'Problem type URI reference.', example: 'about:blank' }),
  title: z.string().meta({ description: 'Short, stable summary of the problem.', example: 'Not Found' }),
  status: z.number().int().min(400).max(599).meta({ description: 'HTTP response status code.', example: 404 }),
  detail: z.string().optional().meta({ description: 'Human-readable explanation for this occurrence.' }),
  instance: z.string().optional().meta({ description: 'URI reference identifying the occurrence.' }),
});

export const ProblemDetailsSchema = BaseProblem.meta({
  id: 'ProblemDetails', description: 'RFC 9457 application/problem+json response.',
});
export const ValidationIssueSchema = z.object({
  pointer: z.string().meta({ description: 'JSON Pointer fragment into the validated input.', example: '#/email' }),
  detail: z.string().meta({ description: 'Validation failure for the input field.', example: 'Invalid email address' }),
}).meta({ id: 'ValidationIssue' });

export const ValidationProblemSchema = BaseProblem.extend({
  type: z.literal(VALIDATION_PROBLEM_TYPE),
  title: z.literal('Validation failed'),
  status: z.literal(422),
  errors: z.array(ValidationIssueSchema).min(1).meta({ description: 'Every invalid value identified by the validator.' }),
}).meta({ id: 'ValidationProblem', description: 'Structured request validation errors (HTTP 422).' });

export const UserNotFoundProblemSchema = BaseProblem.extend({
  type: z.literal('https://example.test/problems/user-not-found'),
  title: z.literal('Not Found'),
  status: z.literal(404),
}).meta({ id: 'UserNotFoundProblem', description: 'Requested user not found.' });

export const UserConflictProblemSchema = BaseProblem.extend({
  type: z.literal('https://example.test/problems/user-already-exists'),
  title: z.literal('Conflict'),
  status: z.literal(409),
}).meta({ id: 'UserConflictProblem', description: 'User already exists.' });

export const InternalProblemSchema = BaseProblem.extend({
  type: z.literal('about:blank'),
  title: z.literal('Internal Server Error'),
  status: z.literal(500),
}).meta({ id: 'InternalProblem', description: 'Unexpected server-side failure.' });


export type ValidationIssue = z.output<typeof ValidationIssueSchema>;
