import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { CommonModule } from './common/common.module.js';
import { PrismaModule } from './database/prisma/prisma.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { TenantModule } from './modules/tenant/tenant.module.js';
import { AccountModule } from './modules/account/account.module.js';
import { DepartmentModule } from './modules/department/department.module.js';
import { RoleModule } from './modules/role/role.module.js';
import { EmployeeModule } from './modules/employee/employee.module.js';
import { AttendanceModule } from './modules/attendance/attendance.module.js';
import { LeaveModule } from './modules/leave/leave.module.js';
import { HolidayModule } from './modules/holiday/holiday.module.js';
import { LeaveBalanceModule } from './modules/leave-balance/leave-balance.module.js';
import { DesignationModule } from './modules/designation/designation.module.js';
import { WorkingScheduleModule } from './modules/working-schedule/working-schedule.module.js';
import { RegularizationModule } from './modules/regularization/regularization.module.js';
import { ApprovalWorkflowModule } from './modules/approval-workflow/approval-workflow.module.js';
import { RequestModule } from './modules/request/request.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    CommonModule,
    PrismaModule,
    AuthModule,
    TenantModule,
    AccountModule,
    DepartmentModule,
    RoleModule,
    EmployeeModule,
    AttendanceModule,
    LeaveModule,
    HolidayModule,
    LeaveBalanceModule,
    DesignationModule,
    WorkingScheduleModule,
    RegularizationModule,
    ApprovalWorkflowModule,
    RequestModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
