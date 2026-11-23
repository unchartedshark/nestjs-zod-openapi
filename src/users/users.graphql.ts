import {
  Field,
  GraphQLISODateTime,
  ID,
  InputType,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import type {
  CreateUser,
  SearchUsers,
  User,
  UsersResult,
} from './users.schema.js';
import { UserRole } from './users.types.js';

/**
 * Code-first GraphQL types, independent of Zod runtime validation.
 *
 * GraphQL validates required fields, scalar types and enum values itself.
 * Domain-level errors are handled by the shared exception filter.
 */
registerEnumType(UserRole, {
  name: 'UserRole',
  description: 'Roles available to users.',
});

/** GraphQL's public user shape; other service fields are not exposed. */
@ObjectType('User')
export class GraphQLUser implements User {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  email!: string;

  @Field(() => String)
  displayName!: string;

  @Field(() => UserRole)
  role!: UserRole;

  // Native GraphQL datetime serialization; no Zod or Standard Schema pipe.
  @Field(() => GraphQLISODateTime)
  createdAt!: Date;
}

/** Response metadata for the GraphQL users query. */
@ObjectType('UsersResult')
export class GraphQLUsersResult implements UsersResult {
  @Field(() => Int)
  total!: number;

  @Field(() => [GraphQLUser])
  users!: GraphQLUser[];
}

/**
 * GraphQL mutation input.
 *
 * A GraphQL default keeps the service's required role populated without a
 * custom validation pipe. REST has an equivalent Zod default.
 */
@InputType('CreateUserInput')
export class GraphQLCreateUserInput implements CreateUser {
  @Field(() => String)
  email!: string;

  @Field(() => String)
  displayName!: string;

  @Field(() => UserRole, { defaultValue: UserRole.member })
  role!: UserRole;
}

/** GraphQL input defaults are declared in its own executable schema. */
@InputType('SearchUsersInput')
export class GraphQLSearchUsersInput implements SearchUsers {
  @Field(() => String, { nullable: true })
  query?: string;

  @Field(() => UserRole, { nullable: true })
  role?: UserRole;

  @Field(() => Int, { defaultValue: 20 })
  limit!: number;
}
