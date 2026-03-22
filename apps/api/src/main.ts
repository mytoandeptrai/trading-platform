import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  // Load environment variables from .env (apps/api/.env)
  dotenv.config();

  const logger = new Logger('Bootstrap');

  try {
    // Create NestJS application with default Nest logger
    const app = await NestFactory.create(AppModule);

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true, // Strip properties that don't have decorators
        forbidNonWhitelisted: false, // Allow and strip non-whitelisted properties (e.g., _t timestamp)
        transform: true, // Automatically transform payloads to DTO instances
        transformOptions: {
          enableImplicitConversion: true, // Convert string to number, etc.
        },
      }),
    );

    // Global exception filter
    app.useGlobalFilters(new HttpExceptionFilter());

    // Global response transform interceptor
    app.useGlobalInterceptors(new TransformInterceptor());

    // CORS configuration
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
    ];

    app.enableCors({
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    // Cookies parser (for reading auth cookies)
    app.use(cookieParser());

    // Global prefix for all routes (except /health)
    app.setGlobalPrefix('api', {
      exclude: ['health', 'health/live', 'health/ready'],
    });

    // Swagger (OpenAPI) setup
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Trading Engine API')
      .setDescription('NestJS Trading POC - Backend API')
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          in: 'header',
        },
        'access-token',
      )
      .addCookieAuth('access_token', {
        type: 'apiKey',
        in: 'cookie',
      })
      .build();

    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, swaggerDocument);

    // Get port from environment
    const port = process.env.PORT || 3001;
    const appName = process.env.APP_NAME || 'Trading Engine API';
    const nodeEnv = process.env.NODE_ENV || 'development';

    // Start server
    await app.listen(port);

    logger.log(`🚀 ${appName} is running on: http://localhost:${port}`);
    logger.log(`🔐 Swagger: http://localhost:${port}/api/docs`);
    logger.log(`🌍 Environment: ${nodeEnv}`);
    logger.log(`🔧 CORS enabled for: ${allowedOrigins.join(', ')}`);
  } catch (error) {
    const errorStack = error instanceof Error ? error.stack : String(error);
    logger.error('Failed to start application', errorStack || 'Unknown error');
    process.exit(1);
  }
}

void bootstrap();
