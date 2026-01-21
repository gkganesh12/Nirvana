import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base exception class for all custom exceptions
 */
export abstract class BaseException extends HttpException {
    constructor(
        message: string,
        statusCode: HttpStatus,
        public readonly errorCode: string,
        public readonly context?: Record<string, any>
    ) {
        super(
            {
                message,
                errorCode,
                statusCode,
                context,
            },
            statusCode
        );
    }
}

/**
 * Validation errors (400)
 */
export class ValidationException extends BaseException {
    constructor(message: string, context?: Record<string, any>) {
        super(message, HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', context);
    }
}

/**
 * Authentication errors (401)
 */
export class AuthenticationException extends BaseException {
    constructor(message: string = 'Authentication failed', context?: Record<string, any>) {
        super(message, HttpStatus.UNAUTHORIZED, 'AUTHENTICATION_ERROR', context);
    }
}

/**
 * Authorization errors (403)
 */
export class AuthorizationException extends BaseException {
    constructor(message: string = 'Access denied', context?: Record<string, any>) {
        super(message, HttpStatus.FORBIDDEN, 'AUTHORIZATION_ERROR', context);
    }
}

/**
 * Resource not found errors (404)
 */
export class ResourceNotFoundException extends BaseException {
    constructor(resource: string, identifier?: string) {
        const message = identifier
            ? `${resource} with identifier '${identifier}' not found`
            : `${resource} not found`;

        super(message, HttpStatus.NOT_FOUND, 'RESOURCE_NOT_FOUND', {
            resource,
            identifier,
        });
    }
}

/**
 * Conflict errors (409)
 */
export class ConflictException extends BaseException {
    constructor(message: string, context?: Record<string, any>) {
        super(message, HttpStatus.CONFLICT, 'CONFLICT_ERROR', context);
    }
}

/**
 * Rate limit errors (429)
 */
export class RateLimitException extends BaseException {
    constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
        super(message, HttpStatus.TOO_MANY_REQUESTS, 'RATE_LIMIT_ERROR', {
            retryAfter,
        });
    }
}

/**
 * External service errors (502)
 */
export class ExternalServiceException extends BaseException {
    constructor(service: string, message?: string) {
        super(
            message || `External service '${service}' is unavailable`,
            HttpStatus.BAD_GATEWAY,
            'EXTERNAL_SERVICE_ERROR',
            { service }
        );
    }
}

/**
 * Internal server errors (500)
 */
export class InternalServerException extends BaseException {
    constructor(message: string = 'Internal server error', context?: Record<string, any>) {
        super(message, HttpStatus.INTERNAL_SERVER_ERROR, 'INTERNAL_SERVER_ERROR', context);
    }
}

/**
 * Database errors (500)
 */
export class DatabaseException extends BaseException {
    constructor(message: string, operation?: string) {
        super(
            message,
            HttpStatus.INTERNAL_SERVER_ERROR,
            'DATABASE_ERROR',
            { operation }
        );
    }
}

/**
 * Configuration errors (500)
 */
export class ConfigurationException extends BaseException {
    constructor(message: string, configKey?: string) {
        super(
            message,
            HttpStatus.INTERNAL_SERVER_ERROR,
            'CONFIGURATION_ERROR',
            { configKey }
        );
    }
}
