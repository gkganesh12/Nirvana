import 'reflect-metadata';
import { Logger } from 'nestjs-pino';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import express from 'express';

import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  // ✅ SECURITY HEADERS with Helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Allowed for Swagger UI
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
    },
  }));

  app.enableShutdownHooks();

  // Raw body for webhook signature verification
  app.use('/webhooks/clerk', express.raw({ type: '*/*', limit: '10mb' }));
  app.use('/webhooks/sentry', express.raw({ type: '*/*', limit: '10mb' }));
  app.use('/webhooks/slack/actions', express.raw({ type: '*/*', limit: '10mb' }));

  // ✅ JSON PAYLOAD SIZE LIMITS to prevent DoS
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.enableCors({
    origin: (origin, callback) => {
      const allowed = process.env.CORS_ORIGINS?.split(',').map((item) => item.trim());
      if (!origin || !allowed?.length || allowed.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('CORS blocked'), false);
    },
    credentials: true,
  });

  // ✅ ENHANCED VALIDATION with security features
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties not in DTO
      forbidNonWhitelisted: true, // Throw error on unknown properties
      transform: true, // Auto-transform to DTO instances
      transformOptions: {
        enableImplicitConversion: false, // Explicit type conversion only
      },
      // Prevent excessively large arrays/objects
      validateCustomDecorators: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('SignalCraft API')
    .setDescription('Enterprise-grade Alert Management Platform API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Webhooks', 'Alert ingestion endpoints')
    .addTag('Alerts', 'Alert management and queries')
    .addTag('Integrations', 'Third-party notification services')
    .addTag('SAML', 'Authentication and SSO')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
}

bootstrap();
