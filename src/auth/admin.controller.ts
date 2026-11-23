import { Controller, Get, SerializeOptions, UseGuards } from '@nestjs/common';
import { AuthGuard, Roles } from '@thallesp/nestjs-better-auth';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { z } from 'zod';
import { ProblemDetailsSchema } from '../problems/problem.schema.js';

/** Public response contract for the admin-only demonstration endpoint. */
const AdminResponseSchema = z.object({
  message: z.string(),
}).meta({ id: 'AdminResponse' });

/**
 * An admin-only route using the community-maintained NestJS Better Auth guard.
 *
 * `@Roles` checks Better Auth's **system user role** from the admin plugin,
 * not a GraphQL role or an organization membership role.
 */
@Controller('admin')
@ApiTags('Admin')
export class AdminController {
  @Get('only')
  @UseGuards(AuthGuard)
  @Roles(['admin'])
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin-only example', description: 'Requires a Better Auth session with the system admin role.' })
  @ApiOkResponse({ standardSchema: AdminResponseSchema })
  @ApiUnauthorizedResponse({ description: 'Not signed in', standardSchema: ProblemDetailsSchema })
  @ApiForbiddenResponse({ description: 'Not an admin', standardSchema: ProblemDetailsSchema })
  @SerializeOptions({ schema: AdminResponseSchema })
  only() {
    return { message: 'Admin access granted.' };
  }
}
