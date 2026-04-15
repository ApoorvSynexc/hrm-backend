import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { HttpAdapterHost } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import {
  AllExceptionsFilter,
  LoggingInterceptor,
  TransformInterceptor,
  I18nService,
} from './common/index.js';
import { ValidationPipe } from './common/pipes/validation.pipe.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable cookie parsing
  app.use(cookieParser());

  // Set global API prefix
  app.setGlobalPrefix('api/v1');

  // Global exception filter — must be registered after app is created
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));

  // Global interceptors — order matters: logging wraps transform
  const i18nService = app.get(I18nService);
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor(i18nService));

  // Global validation pipe — returns first error only
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
