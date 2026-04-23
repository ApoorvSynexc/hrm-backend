import { Module } from '@nestjs/common';
import { RegularizationController } from './regularization.controller.js';
import { RegularizationService } from './regularization.service.js';
import { RegularizationRepository } from './repositories/index.js';

@Module({
  controllers: [RegularizationController],
  providers: [RegularizationService, RegularizationRepository],
  exports: [RegularizationService, RegularizationRepository],
})
export class RegularizationModule {}
