import { Inject } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  GraphQLCreateUserInput,
  GraphQLSearchUsersInput,
  GraphQLUser,
  GraphQLUsersResult,
} from './users.graphql.js';
import { UsersService } from './users.service.js';

/**
 * Thin GraphQL adapter for the same mocked service used by the REST controller.
 *
 * No Standard Schema or Zod validation is applied here: GraphQL validates its
 * own argument types and serializes fields against its code-first schema.
 * Service-thrown domain errors are converted to GraphQL extensions globally.
 */
@AllowAnonymous()
@Resolver(() => GraphQLUser)
export class UsersResolver {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}

  @Query(() => GraphQLUser, { name: 'user' })
  user(@Args('id', { type: () => ID }) id: string) {
    return this.users.findOne(id);
  }

  @Query(() => GraphQLUsersResult, { name: 'users' })
  usersQuery(
    @Args('input', { type: () => GraphQLSearchUsersInput })
    input: GraphQLSearchUsersInput,
  ) {
    return this.users.search(input);
  }

  @Mutation(() => GraphQLUser, { name: 'createUser' })
  createUser(
    @Args('input', { type: () => GraphQLCreateUserInput })
    input: GraphQLCreateUserInput,
  ) {
    return this.users.create(input);
  }
}
