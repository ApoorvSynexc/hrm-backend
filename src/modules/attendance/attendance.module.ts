import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service.js';
import { AttendancePolicyService } from './services/attendance-policy.service.js';
import { AttendanceController } from './attendance.controller.js';
import { AttendanceRepository, AttendanceRegularizationRepository } from './repositories/index.js';

@Module({
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendancePolicyService, AttendanceRepository, AttendanceRegularizationRepository],
})
export class AttendanceModule {}
