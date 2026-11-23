import 'zod-openapi';
import { Field, ID, InputType, Int, ObjectType } from '@nestjs/graphql';
import { z } from 'zod';

/** The authoritative runtime schemas for HTTP and GraphQL data. */
export const UserIdSchema = z.uuid().meta({
  description: 'User UUID (RFC 4122 format).',
  example: '00000000-0000-4000-8000-000000000001',
});

export const UserRoleSchema = z.enum(['admin', 'member']);

export const UserSchema = z.object({
  id: UserIdSchema,
  email: z.email().meta({ description: 'User email address.', example: 'alice@example.test' }),
  displayName: z.string().min(1).meta({ description: 'Name displayed to other users.', example: 'Alice' }),
  role: UserRoleSchema.meta({ description: 'User role.', example: 'admin' }),
}).meta({ id: 'User', description: 'Public user; internal fields are never returned.' });

export const CreateUserSchema = z.object({
  email: z.email().meta({ example: 'charlie@example.test' }),
  displayName: z.string().min(1).max(100).meta({ example: 'Charlie' }),
  role: UserRoleSchema.default('member'),
}).meta({ id: 'CreateUserRequest', description: 'Create a mock user.' });

export const SearchUsersSchema = z.object({
  query: z.string().min(1).optional().meta({ description: 'Substring of email or display name.' }),
  role: UserRoleSchema.optional(),
  limit: z.number().int().min(1).max(100).default(20).meta({ description: 'Maximum number of matches.', example: 20 }),
}).meta({ id: 'SearchUsersRequest', description: 'Body of an HTTP QUERY search.' });

export const UsersResultSchema = z.object({
  total: z.number().int().min(0),
  users: z.array(UserSchema),
}).meta({ id: 'UsersResult', description: 'Matching users and total count.' });

export type User = z.output<typeof UserSchema>;
export type CreateUser = z.output<typeof CreateUserSchema>;
export type SearchUsers = z.output<typeof SearchUsersSchema>;
export type UsersResult = z.output<typeof UsersResultSchema>;

/** GraphQL needs GraphQL type metadata, so these are thin declarations, NOT validation DTOs. */
@ObjectType('User')
export class GraphQLUser implements User {
  @Field(() => ID) id!: string;
  @Field(() => String) email!: string;
  @Field(() => String) displayName!: string;
  @Field(() => String) role!: 'admin' | 'member';
}

@ObjectType('UsersResult')
export class GraphQLUsersResult implements UsersResult {
  @Field(() => Int) total!: number;
  @Field(() => [GraphQLUser]) users!: GraphQLUser[];
}

@InputType('CreateUserInput')
export class GraphQLCreateUserInput {
  @Field(() => String) email!: string;
  @Field(() => String) displayName!: string;
  @Field(() => String, { nullable: true }) role?: string;
}

@InputType('SearchUsersInput')
export class GraphQLSearchUsersInput {
  @Field(() => String, { nullable: true }) query?: string;
  @Field(() => String, { nullable: true }) role?: string;
  @Field(() => Int, { nullable: true }) limit?: number;
}
