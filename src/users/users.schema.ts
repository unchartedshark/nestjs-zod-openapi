import 'zod-openapi';
import { Field, ID, InputType, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { z } from 'zod';

/**
 * Authoritative Zod runtime contracts for the REST and GraphQL user examples.
 *
 * The decorators below describe the executable GraphQL schema; Nest GraphQL
 * code-first still needs explicit types even with Zod runtime validation.
 * Integration tests verify that the two representations stay compatible.
 */
export const UserIdSchema = z.uuid().meta({
  description: 'User UUID.',
  example: '00000000-0000-4000-8000-000000000001',
});

export const UserRoleSchema = z.enum(['admin', 'member']).meta({
  description: 'Access role shared by REST and GraphQL.',
});

registerEnumType(UserRoleSchema.enum, {
  name: 'UserRole',
  description: 'Available user roles (values match the REST representation).',
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

/** Request-body criteria used by HTTP QUERY and GraphQL search. */
export const SearchUsersSchema = z.object({
  query: z.string().min(1).optional().meta({ description: 'Email or display name substring.' }),
  role: UserRoleSchema.optional(),
  limit: z.number().int().min(1).max(100).default(20).meta({
    description: 'Maximum returned matches.',
    example: 20,
  }),
}).meta({ id: 'SearchUsersRequest', description: 'Search criteria.' });

/** Search response shared by both protocols. */
export const UsersResultSchema = z.object({
  total: z.number().int().min(0),
  users: z.array(UserSchema),
}).meta({ id: 'UsersResult', description: 'Matching users and total count.' });

export type User = z.output<typeof UserSchema>;
export type CreateUser = z.output<typeof CreateUserSchema>;
export type SearchUsers = z.output<typeof SearchUsersSchema>;
export type UsersResult = z.output<typeof UsersResultSchema>;

/**
 * GraphQL's object model. Validation and serialization still use `UserSchema`.
 * These classes exist only to provide code-first GraphQL reflection metadata.
 */
@ObjectType('User')
export class GraphQLUser implements User {
  @Field(() => ID) id!: string;
  @Field(() => String) email!: string;
  @Field(() => String) displayName!: string;
  @Field(() => UserRoleSchema.enum) role!: User['role'];
}

/** Metadata for the GraphQL `users` query response. */
@ObjectType('UsersResult')
export class GraphQLUsersResult implements UsersResult {
  @Field(() => Int) total!: number;
  @Field(() => [GraphQLUser]) users!: GraphQLUser[];
}

/** Code-first input definition aligned with `CreateUserSchema`. */
@InputType('CreateUserInput')
export class GraphQLCreateUserInput {
  @Field(() => String) email!: string;
  @Field(() => String) displayName!: string;
  @Field(() => UserRoleSchema.enum, { nullable: true }) role?: User['role'];
}

/** Code-first search input aligned with `SearchUsersSchema`. */
@InputType('SearchUsersInput')
export class GraphQLSearchUsersInput {
  @Field(() => String, { nullable: true }) query?: string;
  @Field(() => UserRoleSchema.enum, { nullable: true }) role?: User['role'];
  @Field(() => Int, { nullable: true }) limit?: number;
}
