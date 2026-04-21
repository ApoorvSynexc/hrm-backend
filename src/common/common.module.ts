import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { I18nService } from './services/i18n.service.js';
import { GeospatialService } from './services/geospatial.service.js';
import { LoggingInterceptor } from './interceptors/logging.interceptor.js';
import { TransformInterceptor } from './interceptors/transform.interceptor.js';
import { CounterRepository } from './repositories/counter.repository.js';

@Global()
@Module({
  providers: [
    I18nService,
    GeospatialService,
    CounterRepository,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
  exports: [I18nService, GeospatialService, CounterRepository],
})
export class CommonModule {}
