import { Inject } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GraphQLStandardSchemaPipe } from '../graphql/graphql-standard-schema.pipe.js';
import {
  CreateUserSchema,
  GraphQLCreateUserInput,
  GraphQLSearchUsersInput,
  GraphQLUser,
  GraphQLUsersResult,
  SearchUsersSchema,
  UserIdSchema,
  UserSchema,
  UsersResultSchema,
  type CreateUser,
  type SearchUsers,
} from './users.schema.js';
import { UsersService } from './users.service.js';

/**
 * GraphQL adapter for UsersService.
 *
 * Resolver arguments are validated through Standard Schema; returned objects
 * are parsed against the same Zod schemas used by the REST serializer.
 */
@Resolver(() => GraphQLUser)
export class UsersResolver {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}

  @Query(() => GraphQLUser, { name: 'user' })
  user(
    @Args('id', { type: () => ID }, new GraphQLStandardSchemaPipe(UserIdSchema))
    id: string,
  ) {
    return UserSchema.parse(this.users.findOne(id));
  }

  @Query(() => GraphQLUsersResult, { name: 'users' })
  usersQuery(
    @Args('input', { type: () => GraphQLSearchUsersInput }, new GraphQLStandardSchemaPipe(SearchUsersSchema))
    input: SearchUsers,
  ) {
    return UsersResultSchema.parse(this.users.search(input));
  }

  @Mutation(() => GraphQLUser, { name: 'createUser' })
  createUser(
    @Args('input', { type: () => GraphQLCreateUserInput }, new GraphQLStandardSchemaPipe(CreateUserSchema))
    input: CreateUser,
  ) {
    return UserSchema.parse(this.users.create(input));
  }
}
