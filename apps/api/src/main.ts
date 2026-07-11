import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3000);
  const nodeEnv = config.get<string>('NODE_ENV', 'development');

  // ── Security middleware ──────────────────────────────────────────────────
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  }));
  app.use(cookieParser());

  // ── CORS ─────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: config.get<string>('WEB_URL', 'http://localhost:3001'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  });

  // ── API Versioning ────────────────────────────────────────────────────────
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // ── Global prefix ─────────────────────────────────────────────────────────
  app.setGlobalPrefix('api');

  // ── Global pipes ─────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Global filters & interceptors ─────────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // ── Swagger ───────────────────────────────────────────────────────────────
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('NexusOS API')
      .setDescription('🚀 AI-Powered Enterprise Operating System — REST API')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .addTag('Auth', 'Authentication & Identity')
      .addTag('Users', 'User management & profiles')
      .addTag('Organizations', 'Organization & team management')
      .addTag('Projects', 'Project management')
      .addTag('Tasks', 'Task lifecycle management')
      .addTag('Channels', 'Real-time communication channels')
      .addTag('Documents', 'Documents & wiki')
      .addTag('Files', 'File storage & management')
      .addTag('AI', 'AI workspace & assistants')
      .addTag('Notifications', 'Notification system')
      .addTag('Search', 'Global search')
      .addTag('Audit', 'Audit logs & security')
      .addTag('Admin', 'Admin console')
      .addTag('Health', 'Health checks')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
    console.info(`📚 Swagger docs: http://localhost:${port}/api/docs`);
  }

  await app.listen(port);
  console.info(`🚀 NexusOS API running on http://localhost:${port}/api`);
  console.info(`🌍 Environment: ${nodeEnv}`);
}

bootstrap();
