import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  QueryMethod,
  SerializeOptions,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
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
 * REST adapter for the mocked user service.
 *
 * Native Nest decorators declare request validation, response serialization
 * and OpenAPI metadata. The Swagger Standard Schema converter automatically
 * registers named component schemas referenced by these decorators.
 *
 * Adding endpoints or models never requires updating the OpenAPI bootstrap.
 */
@AllowAnonymous()
@ApiTags('Users')
@Controller('users')
@ApiInternalServerErrorResponse({
  description: 'Unexpected server failure',
  standardSchema: InternalProblemSchema,
})
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}

  @Get(':id')
  @ApiOperation({ operationId: 'findUser', summary: 'Fetch a mocked user' })
  @ApiOkResponse({ standardSchema: UserSchema })
  @ApiUnprocessableEntityResponse({
    description: 'Invalid identifier',
    standardSchema: ValidationProblemSchema,
  })
  @ApiNotFoundResponse({
    description: 'No such user',
    standardSchema: UserNotFoundProblemSchema,
  })
  @SerializeOptions({ schema: UserSchema })
  findOne(@Param('id', { schema: UserIdSchema }) id: string) {
    return this.users.findOne(id);
  }

  @Post()
  @ApiOperation({ operationId: 'createUser', summary: 'Create a synthetic user' })
  @ApiCreatedResponse({ standardSchema: UserSchema })
  @ApiUnprocessableEntityResponse({
    description: 'Invalid user',
    standardSchema: ValidationProblemSchema,
  })
  @ApiConflictResponse({
    description: 'Email already exists',
    standardSchema: UserConflictProblemSchema,
  })
  @SerializeOptions({ schema: UserSchema })
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
  @ApiOkResponse({ standardSchema: UsersResultSchema })
  @ApiUnprocessableEntityResponse({
    description: 'Invalid search criteria',
    standardSchema: ValidationProblemSchema,
  })
  @SerializeOptions({ schema: UsersResultSchema })
  search(@Body({ schema: SearchUsersSchema }) input: SearchUsers) {
    return this.users.search(input);
  }
}
