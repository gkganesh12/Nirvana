import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody =
      exception instanceof HttpException ? exception.getResponse() : null;

    const errorMessage =
      typeof responseBody === 'string'
        ? responseBody
        : (responseBody as { message?: string })?.message ?? 'Unexpected error';

    response.status(status).json({
      error: {
        message: errorMessage,
        statusCode: status,
        path: request.url,
        method: request.method,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
