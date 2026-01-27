import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, from, throwError } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import { IdempotencyService } from './idempotency.service';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly idempotencyService: IdempotencyService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const method = String(request.method || '').toUpperCase();
    if (method !== 'POST' && method !== 'PUT') {
      return next.handle();
    }

    const idempotencyKey = this.extractKey(request);
    if (!idempotencyKey) {
      return next.handle();
    }

    return from(this.handleIdempotency(request, response, idempotencyKey, method)).pipe(
      mergeMap((handler) => handler(next)),
    );
  }

  private async handleIdempotency(
    request: any,
    response: any,
    idempotencyKey: string,
    method: string,
  ) {
    if (idempotencyKey.length > 128) {
      throw new BadRequestException('Idempotency-Key is too long');
    }

    const workspaceId = await this.idempotencyService.resolveWorkspaceId(request);
    const requestHash = this.idempotencyService.computeRequestHash({
      body: request.body ?? null,
      query: request.query ?? null,
    });

    const path = request.originalUrl || request.url || '';
    let existing = await this.idempotencyService.findExisting(workspaceId, idempotencyKey);
    existing = await this.idempotencyService.cleanupIfExpired(existing);

    if (existing) {
      if (
        existing.requestHash !== requestHash ||
        existing.method !== method ||
        existing.path !== path
      ) {
        throw new ConflictException('Idempotency key already used with different request');
      }

      if (existing.status === 'COMPLETED') {
        const statusCode = existing.statusCode ?? 200;
        response.status(statusCode);
        return () => from(Promise.resolve(existing.responseBody));
      }

      throw new ConflictException('Request is already in progress');
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const record = await this.idempotencyService.createInProgress({
      workspaceId,
      key: idempotencyKey,
      method,
      path,
      requestHash,
      expiresAt,
    });

    return (next: CallHandler) =>
      next.handle().pipe(
        mergeMap((data) =>
          from(
            this.idempotencyService.markCompleted(record.id, response.statusCode ?? 200, data),
          ).pipe(mergeMap(() => from(Promise.resolve(data)))),
        ),
        catchError((error) =>
          from(this.idempotencyService.markFailed(record.id)).pipe(
            mergeMap(() => throwError(() => error)),
          ),
        ),
      );
  }

  private extractKey(request: any): string | null {
    const header = request.headers['idempotency-key'] ?? request.headers['Idempotency-Key'];
    if (!header) {
      return null;
    }
    return String(header).trim();
  }
}
