import { validate, IsOptional } from 'class-validator';
import {
    MaxJsonDepth,
    IsSafeUrl,
    IsSanitized,
    IsAllowedDomain,
} from './custom-validators';

class TestDto {
    @IsOptional()
    @MaxJsonDepth(3)
    payload?: any;

    @IsOptional()
    @IsSafeUrl()
    url?: string;

    @IsOptional()
    @IsSanitized()
    content?: string;

    @IsOptional()
    @IsAllowedDomain(['example.com', 'signalcraft.io'])
    domain?: string;
}

describe('Security Validation Decorators', () => {
    describe('MaxJsonDepth', () => {
        it('should pass for shallow JSON', async () => {
            const dto = new TestDto();
            dto.payload = { a: 1, b: { c: 2 } }; // Depth 2
            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });

        it('should fail for deep JSON (JSON bomb simulation)', async () => {
            const dto = new TestDto();
            dto.payload = { a: { b: { c: { d: 4 } } } }; // Depth 4
            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('maxJsonDepth');
        });

        it('should handle arrays correctly', async () => {
            const dto = new TestDto();
            dto.payload = [1, [2, [3, [4]]]]; // Depth 4
            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
        });
    });

    describe('IsSafeUrl', () => {
        it('should pass for safe URLs', async () => {
            const dto = new TestDto();
            dto.url = 'https://example.com/safe?param=1';
            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });

        it('should fail for javascript: URLs (XSS)', async () => {
            const dto = new TestDto();
            dto.url = 'javascript:alert(1)';
            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('isSafeUrl');
        });

        it('should fail for data: URLs (XSS)', async () => {
            const dto = new TestDto();
            dto.url = 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==';
            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
        });
    });

    describe('IsSanitized', () => {
        it('should pass for normal text', async () => {
            const dto = new TestDto();
            dto.content = 'Hello world 123';
            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });

        it('should fail for script tags (XSS)', async () => {
            const dto = new TestDto();
            dto.content = '<script>alert("xss")</script>';
            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('isSanitized');
        });

        it('should fail for event handlers (XSS)', async () => {
            const dto = new TestDto();
            dto.content = '<img src=x onerror=alert(1)>';
            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
        });
    });

    describe('IsAllowedDomain', () => {
        it('should pass for allowed domains', async () => {
            const dto = new TestDto();
            dto.domain = 'user@example.com';
            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });

        it('should pass for subdomains of allowed domains', async () => {
            const dto = new TestDto();
            dto.domain = 'user@api.example.com';
            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });

        it('should fail for dangerous domains', async () => {
            const dto = new TestDto();
            dto.domain = 'user@malicious-site.com';
            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].constraints).toHaveProperty('isAllowedDomain');
        });
    });
});
