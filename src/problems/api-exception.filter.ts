import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { GraphQLError } from 'graphql';
import { STATUS_CODES } from 'node:http';
import { UserDomainError } from '../users/users.errors.js';
import { InputValidationError } from './input-validation.error.js';
import { VALIDATION_PROBLEM_TYPE } from './problem.schema.js';

/** One global filter that respects the different HTTP and GraphQL error contracts. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);
  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType<string>() === 'graphql') {
      if (exception instanceof GraphQLError) return exception;
      if (exception instanceof UserDomainError) {
        return new GraphQLError(exception.message, {
          extensions: { code: exception.code, httpStatus: exception.httpStatus, problemType: exception.problemType },
        });
      }
      if (exception instanceof Error) this.logger.error(exception.stack);
      return new GraphQLError('Internal server error', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
    }

    const { httpAdapter } = this.adapterHost;
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const status = exception instanceof UserDomainError
      ? exception.httpStatus
      : exception instanceof HttpException ? exception.getStatus() : 500;
    const validation = exception instanceof InputValidationError;

    if (status >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }
    const exceptionMessage = exception instanceof HttpException
      ? exception.getResponse()
      : undefined;
    const publicDetail = exception instanceof UserDomainError
      ? exception.message
      : typeof exceptionMessage === 'string' ? exceptionMessage
      : exceptionMessage && typeof exceptionMessage === 'object' && 'message' in exceptionMessage
        && typeof exceptionMessage.message === 'string' ? exceptionMessage.message
        : 'Request failed.';

    const problem = {
      type: validation ? VALIDATION_PROBLEM_TYPE
        : exception instanceof UserDomainError ? exception.problemType : 'about:blank',
      title: validation ? 'Validation failed' : STATUS_CODES[status] ?? 'Error',
      status,
      detail: status >= 500 ? 'An unexpected server error occurred.' : publicDetail,
      instance: httpAdapter.getRequestUrl(request).split('?')[0],
      ...(validation ? { errors: exception.issues } : {}),
    };
    httpAdapter.setHeader(response, 'Content-Type', 'application/problem+json');
    httpAdapter.reply(response, problem, status);
  }
}
