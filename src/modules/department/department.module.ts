import { Module } from '@nestjs/common';
import { DepartmentService } from './department.service.js';
import { DepartmentController } from './department.controller.js';
import { DepartmentRepository } from './repositories/index.js';

@Module({
  controllers: [DepartmentController],
  providers: [DepartmentService, DepartmentRepository],
  exports: [DepartmentRepository],
})
export class DepartmentModule {}
