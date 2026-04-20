import { Module } from '@nestjs/common';
import { DesignationService } from './designation.service.js';
import { DesignationController } from './designation.controller.js';
import { DesignationRepository } from './repositories/index.js';

@Module({
  controllers: [DesignationController],
  providers: [DesignationService, DesignationRepository],
  exports: [DesignationRepository],
})
export class DesignationModule {}
