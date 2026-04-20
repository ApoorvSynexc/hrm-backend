import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service.js';
import { TenantController } from './tenant.controller.js';
import { TenantRepository } from './repositories/tenant.repository.js';
import { WorkingScheduleRepository } from './repositories/working-schedule.repository.js';
import { AccountModule } from '../account/account.module.js';
import { RoleModule } from '../role/role.module.js';
import { EmployeeModule } from '../employee/employee.module.js';

@Module({
  imports: [AccountModule, RoleModule, EmployeeModule],
  controllers: [TenantController],
  providers: [
    TenantService,
    TenantRepository,
    WorkingScheduleRepository,
  ],
  exports: [
    TenantRepository,
    WorkingScheduleRepository,
  ],
})
export class TenantModule {}
