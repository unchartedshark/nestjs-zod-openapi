import { z } from 'zod';
import { BaseProblemSchema } from '../problems/problem.schema.js';
import {
  USER_ALREADY_EXISTS_PROBLEM_TYPE,
  USER_NOT_FOUND_PROBLEM_TYPE,
} from './users.errors.js';

/**
 * Feature-specific HTTP problem models.
 *
 * These are discovered from response decorators on UsersController. They
 * are intentionally not registered or imported by the global error filter.
 */
export const UserNotFoundProblemSchema = BaseProblemSchema.extend({
  type: z.literal(USER_NOT_FOUND_PROBLEM_TYPE),
  title: z.literal('Not Found'),
  status: z.literal(404),
}).meta({ id: 'UserNotFoundProblem', description: 'Requested user not found.' });

export const UserConflictProblemSchema = BaseProblemSchema.extend({
  type: z.literal(USER_ALREADY_EXISTS_PROBLEM_TYPE),
  title: z.literal('Conflict'),
  status: z.literal(409),
}).meta({ id: 'UserConflictProblem', description: 'User already exists.' });
