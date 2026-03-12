import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { LoggerService } from './common/logger/logger.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new LoggerService('Bootstrap');

  try {
    // Create NestJS application with custom logger
    const app = await NestFactory.create(AppModule, {
      logger: new LoggerService('NestApplication'),
    });

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true, // Strip properties that don't have decorators
        forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
        transform: true, // Automatically transform payloads to DTO instances
        transformOptions: {
          enableImplicitConversion: true, // Convert string to number, etc.
        },
      }),
    );

    // Global exception filter
    app.useGlobalFilters(new HttpExceptionFilter(logger));

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

    // Global prefix for all routes (except /health)
    app.setGlobalPrefix('api', {
      exclude: ['health', 'health/live', 'health/ready'],
    });

    // Get port from environment
    const port = process.env.PORT || 3001;
    const appName = process.env.APP_NAME || 'Trading Engine API';
    const nodeEnv = process.env.NODE_ENV || 'development';

    // Start server
    await app.listen(port);

    logger.log(`🚀 ${appName} is running on: http://localhost:${port}`);
    logger.log(`📚 API endpoints: http://localhost:${port}/api`);
    logger.log(`💚 Health check: http://localhost:${port}/health`);
    logger.log(`🔐 Auth: http://localhost:${port}/api/auth`);
    logger.log(`💰 Account: http://localhost:${port}/api/account`);
    logger.log(`🌍 Environment: ${nodeEnv}`);
    logger.log(`🔧 CORS enabled for: ${allowedOrigins.join(', ')}`);
  } catch (error) {
    const errorStack = error instanceof Error ? error.stack : String(error);
    logger.error('Failed to start application', errorStack || 'Unknown error');
    process.exit(1);
  }
}

void bootstrap();
