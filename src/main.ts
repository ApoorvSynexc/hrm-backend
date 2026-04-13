import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module.js';
import {
  AllExceptionsFilter,
  LoggingInterceptor,
  TransformInterceptor,
} from './common/index.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global exception filter — must be registered after app is created
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));

  // Global interceptors — order matters: logging wraps transform
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
