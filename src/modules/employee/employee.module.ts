import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module.js';
import { EmployeeService } from './employee.service.js';
import { EmployeeController } from './employee.controller.js';

@Module({
  imports: [AccountModule],
  controllers: [EmployeeController],
  providers: [EmployeeService],
})
export class EmployeeModule {}
