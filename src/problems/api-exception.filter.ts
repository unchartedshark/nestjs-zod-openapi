import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { GraphQLError } from 'graphql';
import { STATUS_CODES } from 'node:http';
import { DomainError } from './domain.error.js';
import { InputValidationError } from './input-validation.error.js';
import { VALIDATION_PROBLEM_TYPE } from './problem.schema.js';

/**
 * Renders any expected application error using its shared DomainError contract.
 *
 * REST responses follow RFC 9457 with `application/problem+json`.
 * GraphQL errors use `errors[].extensions`; returning a REST body inside
 * GraphQL would violate the GraphQL response contract.
 *
 * The transport check is essential because both APIs share one Nest app.
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): GraphQLError | void {
    if (host.getType<string>() === 'graphql') {
      return this.toGraphqlError(exception);
    }

    this.replyWithProblem(exception, host);
  }

  private toGraphqlError(exception: unknown): GraphQLError {
    if (exception instanceof GraphQLError) {
      return exception;
    }

    if (exception instanceof DomainError) {
      // Unexpected server failures must not expose their internal messages.
      if (exception.httpStatus >= 500) {
        this.logUnexpectedException(exception);
        return new GraphQLError('Internal server error', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }

      return new GraphQLError(exception.message, {
        extensions: {
          code: exception.code,
          httpStatus: exception.httpStatus,
          problemType: exception.problemType,
        },
      });
    }

    this.logUnexpectedException(exception);
    return new GraphQLError('Internal server error', {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }

  private replyWithProblem(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.adapterHost;
    const context = host.switchToHttp();
    const response = context.getResponse();
    const request = context.getRequest();
    const status = this.httpStatus(exception);
    const validation = exception instanceof InputValidationError;

    if (status >= 500) {
      this.logUnexpectedException(exception);
    }

    const problem = {
      type: this.problemType(exception),
      title: validation ? 'Validation failed' : (STATUS_CODES[status] ?? 'Error'),
      status,
      detail: this.problemDetail(exception, status),
      instance: httpAdapter.getRequestUrl(request).split('?')[0],
      ...(validation && { errors: exception.issues }),
    };

    httpAdapter.setHeader(response, 'Content-Type', 'application/problem+json');
    httpAdapter.reply(response, problem, status);
  }

  private httpStatus(exception: unknown): number {
    if (exception instanceof DomainError) {
      return exception.httpStatus;
    }
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    return 500;
  }

  private problemType(exception: unknown): string {
    if (exception instanceof InputValidationError) {
      return VALIDATION_PROBLEM_TYPE;
    }
    if (exception instanceof DomainError) {
      return exception.problemType;
    }
    return 'about:blank';
  }

  private problemDetail(exception: unknown, status: number): string {
    // Do not expose stack traces or internal error messages to HTTP clients.
    if (status >= 500) {
      return 'An unexpected server error occurred.';
    }
    if (exception instanceof DomainError) {
      return exception.message;
    }
    if (!(exception instanceof HttpException)) {
      return 'Request failed.';
    }

    const response = exception.getResponse();
    if (typeof response === 'string') {
      return response;
    }
    if (typeof response === 'object' && response !== null && 'message' in response) {
      const message = response.message;
      if (typeof message === 'string') {
        return message;
      }
    }
    return 'Request failed.';
  }

  private logUnexpectedException(exception: unknown): void {
    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
  }
}
