import { Module } from '@nestjs/common';
import { TenantModule } from '../tenant/tenant.module.js';
import { WorkingScheduleRepository } from './repositories/index.js';
import { WorkingScheduleController } from './working-schedule.controller.js';
import { WorkingScheduleService } from './working-schedule.service.js';

@Module({
  imports: [TenantModule],
  controllers: [WorkingScheduleController],
  providers: [WorkingScheduleService, WorkingScheduleRepository],
  exports: [WorkingScheduleRepository],
})
export class WorkingScheduleModule {}
