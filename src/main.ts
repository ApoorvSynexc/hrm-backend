import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { HttpAdapterHost } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/index.js';
import { ValidationPipe } from './common/pipes/validation.pipe.js';
import { ENV } from './common/constants/index.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins = [
    'http://localhost:5173',
    'https://hrm-frontend.vercel.app',
    'http://3.110.44.44:5173',
  ];

  // Enable CORS for frontend development
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Language', 'X-Tenant-ID'],
  });

  // Enable cookie parsing
  app.use(cookieParser());

  // Set global API prefix
  app.setGlobalPrefix('api/v1');

  // Global exception filter — must be registered after app is created
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));

  // Global interceptors are registered in CommonModule via APP_INTERCEPTOR token

  // Global validation pipe — returns first error only
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  await app.listen(ENV.PORT);
}
bootstrap();
