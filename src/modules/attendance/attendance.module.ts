import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service.js';
import { AttendancePolicyService } from './services/attendance-policy.service.js';
import { AttendanceCronService } from './services/attendance-cron.service.js';
import { AttendanceController } from './attendance.controller.js';
import { AttendanceRepository, AttendanceLogRepository } from './repositories/index.js';

@Module({
  controllers: [AttendanceController],
  providers: [
    AttendanceService,
    AttendancePolicyService,
    AttendanceCronService,
    AttendanceRepository,
    AttendanceLogRepository,
  ],
})
export class AttendanceModule {}
