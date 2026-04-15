import { Global, Module } from '@nestjs/common';
import { I18nService } from './services/i18n.service.js';

@Global()
@Module({
  providers: [I18nService],
  exports: [I18nService],
})
export class CommonModule {}
