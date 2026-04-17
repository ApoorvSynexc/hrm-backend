import { Module } from '@nestjs/common';
import { EmployeeService } from './employee.service.js';
import { EmployeeController } from './employee.controller.js';
import { EmployeeRepository } from './repositories/employee.repository.js';

@Module({
  controllers: [EmployeeController],
  providers: [EmployeeService, EmployeeRepository],
})
export class EmployeeModule {}
