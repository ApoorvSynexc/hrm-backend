import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DepartmentService } from './department.service.js';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/index.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Permissions } from '../../common/decorators/permissions.decorator.js';

@Controller('departments')
export class DepartmentController {
  constructor(private departmentService: DepartmentService) {}

  /**
   * Create a new department
   * POST /departments
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions('create:department')
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateDepartmentDto,
  ) {
    const department = await this.departmentService.createDepartment(
      tenantId,
      dto,
    );
    return { message: 'common.created', data: department };
  }

  /**
   * Get all departments or a specific department
   * GET /departments (list all)
   * GET /departments?id=xxx (get single)
   */
  @Get()
  @Permissions('read:department')
  async list(
    @CurrentUser('tenantId') tenantId: string,
    @Query('id') id?: string,
  ) {
    // If id is provided, return single department; otherwise list all
    if (id) {
      const department = await this.departmentService.getDepartmentById(
        tenantId,
        id,
      );
      return { message: 'common.fetched', data: department };
    }

    const departments = await this.departmentService.getDepartments(tenantId);
    return { message: 'common.fetched', data: departments };
  }

  /**
   * Update a department
   * PATCH /departments?id=xxx
   */
  @Patch()
  @HttpCode(HttpStatus.OK)
  @Permissions('update:department')
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @Query('id') id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    const department = await this.departmentService.updateDepartment(
      tenantId,
      id,
      dto,
    );
    return { message: 'common.updated', data: department };
  }

  /**
   * Delete a department (soft delete)
   * DELETE /departments?id=xxx
   */
  @Delete()
  @HttpCode(HttpStatus.OK)
  @Permissions('delete:department')
  async delete(
    @CurrentUser('tenantId') tenantId: string,
    @Query('id') id: string,
  ) {
    const department = await this.departmentService.deleteDepartment(
      tenantId,
      id,
    );
    return { message: 'common.deleted', data: department };
  }
}
