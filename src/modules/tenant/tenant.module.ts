import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service.js';
import { TenantController } from './tenant.controller.js';
import { TenantRepository } from './repositories/tenant.repository.js';
import { WorkingHoursRepository } from './repositories/working-hours.repository.js';
import { WorkingDayRepository } from './repositories/working-day.repository.js';
import { AccountModule } from '../account/account.module.js';
import { RoleModule } from '../role/role.module.js';

@Module({
  imports: [AccountModule, RoleModule],
  controllers: [TenantController],
  providers: [
    TenantService,
    TenantRepository,
    WorkingHoursRepository,
    WorkingDayRepository,
  ],
  exports: [
    TenantRepository,
    WorkingHoursRepository,
    WorkingDayRepository,
  ],
})
export class TenantModule {}
