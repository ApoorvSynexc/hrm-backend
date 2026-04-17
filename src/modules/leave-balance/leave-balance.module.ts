import { Module } from '@nestjs/common';
import { LeaveBalanceService } from './leave-balance.service.js';
import { LeaveBalanceController } from './leave-balance.controller.js';
import { LeaveBalanceRepository } from './repositories/leave-balance.repository.js';

@Module({
  controllers: [LeaveBalanceController],
  providers: [LeaveBalanceService, LeaveBalanceRepository],
  exports: [LeaveBalanceService],
})
export class LeaveBalanceModule {}
