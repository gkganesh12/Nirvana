import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

/**
 * Custom validator to check JSON depth to prevent JSON bomb attacks
 * @param maxDepth Maximum allowed nesting depth
 */
export function MaxJsonDepth(maxDepth: number, validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'maxJsonDepth',
            target: object.constructor,
            propertyName: propertyName,
            constraints: [maxDepth],
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    const [maxDepth] = args.constraints;

                    if (typeof value !== 'object' || value === null) {
                        return true; // Not a JSON object, pass through
                    }

                    function getDepth(obj: any, currentDepth = 1): number {
                        if (typeof obj !== 'object' || obj === null) {
                            return currentDepth;
                        }

                        if (Array.isArray(obj)) {
                            return Math.max(
                                currentDepth,
                                ...obj.map(item => getDepth(item, currentDepth + 1))
                            );
                        }

                        return Math.max(
                            currentDepth,
                            ...Object.values(obj).map(val => getDepth(val, currentDepth + 1))
                        );
                    }

                    const depth = getDepth(value);
                    return depth <= maxDepth;
                },
                defaultMessage(args: ValidationArguments) {
                    return `JSON nesting depth exceeds maximum allowed depth of ${args.constraints[0]}`;
                },
            },
        });
    };
}

/**
 * Validator for safe URLs (prevents javascript:, data:, file: protocols)
 */
export function IsSafeUrl(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'isSafeUrl',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any) {
                    if (value === null || value === undefined) {
                        return true;
                    }
                    if (typeof value !== 'string') {
                        return false;
                    }

                    // Disallow dangerous protocols
                    const dangerousProtocols = ['javascript:', 'data:', 'file:', 'vbscript:'];
                    const lowercaseValue = value.toLowerCase().trim();

                    for (const protocol of dangerousProtocols) {
                        if (lowercaseValue.startsWith(protocol)) {
                            return false;
                        }
                    }

                    // Must be http/https or relative URL
                    return (
                        lowercaseValue.startsWith('http://') ||
                        lowercaseValue.startsWith('https://') ||
                        lowercaseValue.startsWith('/') ||
                        lowercaseValue.startsWith('./')
                    );
                },
                defaultMessage() {
                    return 'URL must use http, https, or be a relative path';
                },
            },
        });
    };
}

/**
 * Validator for sanitized strings (prevents XSS)
 */
export function IsSanitized(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'isSanitized',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any) {
                    if (typeof value !== 'string') {
                        return true;
                    }

                    // Check for common XSS patterns
                    const xssPatterns = [
                        /<script/i,
                        /javascript:/i,
                        /on\w+\s*=/i, // onclick=, onload=, etc.
                        /<iframe/i,
                        /<object/i,
                        /<embed/i,
                    ];

                    return !xssPatterns.some(pattern => pattern.test(value));
                },
                defaultMessage() {
                    return 'String contains potentially dangerous content';
                },
            },
        });
    };
}

/**
 * Validator for allowed email domains
 */
export function IsAllowedDomain(allowedDomains: string[], validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'isAllowedDomain',
            target: object.constructor,
            propertyName: propertyName,
            constraints: [allowedDomains],
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    if (value === null || value === undefined) {
                        return true;
                    }
                    if (typeof value !== 'string' || !value.includes('@')) {
                        return false;
                    }

                    const [allowedDomains] = args.constraints;
                    const domain = value.split('@')[1]?.toLowerCase();

                    if (!domain) {
                        return false;
                    }

                    // Check if domain matches or is a subdomain
                    return allowedDomains.some((allowed: string) =>
                        domain === allowed.toLowerCase() || domain.endsWith(`.${allowed.toLowerCase()}`)
                    );
                },
                defaultMessage(args: ValidationArguments) {
                    return `Email domain must be one of: ${args.constraints[0].join(', ')}`;
                },
            },
        });
    };
}
