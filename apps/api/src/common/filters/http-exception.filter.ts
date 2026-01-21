import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { BaseException } from '../exceptions/base.exception';

interface ErrorResponse {
  statusCode: number;
  message: string;
  errorCode: string;
  timestamp: string;
  path: string;
  context?: Record<string, any>;
  stack?: string;
}

/**
 * Global exception filter for standardized error responses
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest();

    const errorResponse = this.buildErrorResponse(exception, request);

    // Log error with appropriate level
    this.logError(exception, errorResponse);

    // Send standardized error response
    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private buildErrorResponse(exception: unknown, request: any): ErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;

    // Handle custom BaseException
    if (exception instanceof BaseException) {
      return {
        statusCode: exception.getStatus(),
        message: exception.message,
        errorCode: exception.errorCode,
        timestamp,
        path,
        context: exception.context,
        ...(process.env.NODE_ENV === 'development' && {
          stack: exception.stack,
        }),
      };
    }

    // Handle standard NestJS HttpException
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      let message: string;
      let errorCode: string;

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        errorCode = this.getErrorCodeForStatus(status);
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || responseObj.error || exception.message;
        errorCode = responseObj.errorCode || this.getErrorCodeForStatus(status);
      } else {
        message = exception.message;
        errorCode = this.getErrorCodeForStatus(status);
      }

      return {
        statusCode: status,
        message: Array.isArray(message) ? message.join(', ') : message,
        errorCode,
        timestamp,
        path,
        ...(process.env.NODE_ENV === 'development' && {
          stack: exception.stack,
        }),
      };
    }

    // Handle unknown errors
    const message = exception instanceof Error ? exception.message : 'Internal server error';
    const stack = exception instanceof Error ? exception.stack : undefined;

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message,
      errorCode: 'INTERNAL_SERVER_ERROR',
      timestamp,
      path,
      ...(process.env.NODE_ENV === 'development' && { stack }),
    };
  }

  private getErrorCodeForStatus(status: number): string {
    const errorCodes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'VALIDATION_ERROR',
      429: 'RATE_LIMIT_EXCEEDED',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
    };

    return errorCodes[status] || 'UNKNOWN_ERROR';
  }

  private logError(exception: unknown, errorResponse: ErrorResponse): void {
    const { statusCode, message, errorCode, path, context } = errorResponse;

    // Log with different levels based on status code
    if (statusCode >= 500) {
      // Server errors - critical
      this.logger.error(
        `[${errorCode}] ${message}`,
        {
          statusCode,
          path,
          context,
          stack: exception instanceof Error ? exception.stack : undefined,
        }
      );
    } else if (statusCode >= 400) {
      // Client errors - warning
      this.logger.warn(
        `[${errorCode}] ${message}`,
        {
          statusCode,
          path,
          context,
        }
      );
    } else {
      // Other - info
      this.logger.log(
        `[${errorCode}] ${message}`,
        {
          statusCode,
          path,
        }
      );
    }
  }
}
