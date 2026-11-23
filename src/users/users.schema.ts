import 'zod-openapi';
import { UserRole } from './users.types.js';
import { z } from 'zod';

/**
 * Zod models for the REST API, OpenAPI documentation and Orval fixtures.
 *
 * GraphQL has its own code-first schema. These models are not applied as a
 * second validation layer to GraphQL resolver arguments or responses.
 */
export const UserIdSchema = z.uuid().meta({
  description: 'User UUID.',
  example: '00000000-0000-4000-8000-000000000001',
});

export const UserRoleSchema = z.enum(UserRole).meta({
  description: 'Access role shared by REST and GraphQL.',
});


/** Public user; internal service fields are intentionally stripped. */
export const UserSchema = z.object({
  id: UserIdSchema,
  email: z.email().meta({ description: 'User email address.', example: 'alice@example.test' }),
  displayName: z.string().min(1).meta({ description: 'Name displayed to other users.', example: 'Alice' }),
  role: UserRoleSchema,
}).meta({ id: 'User', description: 'Public user representation.' });

/** Data accepted when creating a mocked user. */
export const CreateUserSchema = z.object({
  email: z.email().meta({ example: 'charlie@example.test' }),
  displayName: z.string().min(1).max(100).meta({ example: 'Charlie' }),
  role: UserRoleSchema.default('member'),
}).meta({ id: 'CreateUserRequest', description: 'Create a mock user.' });

/** Request-body criteria used by the HTTP QUERY endpoint. */
export const SearchUsersSchema = z.object({
  query: z.string().min(1).optional().meta({ description: 'Email or display name substring.' }),
  role: UserRoleSchema.optional(),
  limit: z.number().int().min(1).max(100).default(20).meta({
    description: 'Maximum returned matches.',
    example: 20,
  }),
}).meta({ id: 'SearchUsersRequest', description: 'Search criteria.' });

/** REST search result, also used as a TypeScript shape by the mock service. */
export const UsersResultSchema = z.object({
  total: z.number().int().min(0),
  users: z.array(UserSchema),
}).meta({ id: 'UsersResult', description: 'Matching users and total count.' });

export type User = z.output<typeof UserSchema>;
export type CreateUser = z.output<typeof CreateUserSchema>;
export type SearchUsers = z.output<typeof SearchUsersSchema>;
export type UsersResult = z.output<typeof UsersResultSchema>;

