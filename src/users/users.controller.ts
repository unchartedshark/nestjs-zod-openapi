import { Body, Controller, Get, HttpCode, Inject, Param, Post, QueryMethod } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProblem, ApiZodResponse } from '../problems/api-response.decorator.js';
import {
  InternalProblemSchema,
  UserConflictProblemSchema,
  UserNotFoundProblemSchema,
  ValidationProblemSchema,
} from '../problems/problem.schema.js';
import {
  CreateUserSchema,
  SearchUsersSchema,
  UserIdSchema,
  UserSchema,
  UsersResultSchema,
  type CreateUser,
  type SearchUsers,
} from './users.schema.js';
import { UsersService } from './users.service.js';

/**
 * REST adapter for the same mocked service used by GraphQL.
 *
 * Parameter decorators describe input Standard Schemas; response decorators
 * install runtime Zod serialization and named OpenAPI component references.
 */
@ApiTags('Users')
@Controller('users')
@ApiProblem(500, InternalProblemSchema, 'Unexpected server failure')
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}

  @Get(':id')
  @ApiOperation({ operationId: 'findUser', summary: 'Fetch a mocked user' })
  @ApiZodResponse(200, UserSchema)
  @ApiProblem(422, ValidationProblemSchema, 'Invalid identifier')
  @ApiProblem(404, UserNotFoundProblemSchema, 'No such user')
  findOne(@Param('id', { schema: UserIdSchema }) id: string) {
    return this.users.findOne(id);
  }

  @Post()
  @ApiOperation({ operationId: 'createUser', summary: 'Create a synthetic user' })
  @ApiZodResponse(201, UserSchema)
  @ApiProblem(422, ValidationProblemSchema, 'Invalid user')
  @ApiProblem(409, UserConflictProblemSchema, 'Email already exists')
  create(@Body({ schema: CreateUserSchema }) input: CreateUser) {
    return this.users.create(input);
  }

  @QueryMethod('search')
  @HttpCode(200)
  @ApiOperation({
    operationId: 'searchUsers',
    summary: 'Read-only structured search using HTTP QUERY',
    description: 'RFC 10008 QUERY carries read-only search criteria in a JSON request body.',
  })
  @ApiZodResponse(200, UsersResultSchema)
  @ApiProblem(422, ValidationProblemSchema, 'Invalid search criteria')
  search(@Body({ schema: SearchUsersSchema }) input: SearchUsers) {
    return this.users.search(input);
  }
}
