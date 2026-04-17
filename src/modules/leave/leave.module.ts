import { Module } from '@nestjs/common';
import { LeaveService } from './leave.service.js';
import { LeaveController } from './leave.controller.js';
import { LeaveRepository } from './repositories/leave.repository.js';

@Module({
  controllers: [LeaveController],
  providers: [LeaveService, LeaveRepository],
})
export class LeaveModule {}
