import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { I18nService } from './services/i18n.service.js';
import { LoggingInterceptor } from './interceptors/logging.interceptor.js';
import { TransformInterceptor } from './interceptors/transform.interceptor.js';

@Global()
@Module({
  providers: [
    I18nService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
  exports: [I18nService],
})
export class CommonModule {}
