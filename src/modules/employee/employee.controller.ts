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
  ForbiddenException,
} from '@nestjs/common';
import { EmployeeService } from './employee.service.js';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/index.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { Permissions } from '../../common/decorators/permissions.decorator.js';

@Controller('employees')
export class EmployeeController {
  constructor(private employeeService: EmployeeService) {}

  /**
   * Create a new employee
   * POST /employees
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions('create:employee')
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateEmployeeDto,
  ) {
    const employee = await this.employeeService.createEmployee(tenantId, dto);
    return { message: 'common.created', data: employee };
  }

  /**
   * List all employees or get a specific employee
   * GET /employees (list all)
   * GET /employees?id=xxx (get single)
   */
  @Get()
  @Permissions('read:employee')
  async list(
    @CurrentUser('tenantId') tenantId: string,
    @Query('id') id?: string,
  ) {
    // If id is provided, return single employee; otherwise list all
    if (id) {
      const employee = await this.employeeService.getEmployeeById(tenantId, id);
      return { message: 'common.fetched', data: employee };
    }

    const employees = await this.employeeService.listEmployees(tenantId);
    return { message: 'common.fetched', data: employees };
  }

  /**
   * Update an employee
   * PATCH /employees?id=xxx
   */
  @Patch()
  @HttpCode(HttpStatus.OK)
  @Permissions('update:employee')
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @Query('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    const employee = await this.employeeService.updateEmployee(tenantId, id, dto);
    return { message: 'common.updated', data: employee };
  }

  /**
   * Delete an employee (soft delete)
   * DELETE /employees?id=xxx
   */
  @Delete()
  @HttpCode(HttpStatus.OK)
  @Permissions('delete:employee')
  async delete(
    @CurrentUser('tenantId') tenantId: string,
    @Query('id') id: string,
  ) {
    const employee = await this.employeeService.deleteEmployee(tenantId, id);
    return { message: 'common.deleted', data: employee };
  }

  /**
   * Get all employees across all tenants (super admin only)
   * GET /employees/all?tenantId=xxx&status=ACTIVE
   */
  @Get('all')
  @Permissions('manage:all')
  async getAllEmployees(
    @CurrentUser() user: JwtPayload,
    @Query('tenantId') tenantId?: string,
    @Query('status') status?: string,
  ) {
    if (user.tenantId !== null && user.tenantId !== undefined) {
      throw new ForbiddenException('Only super admin can access this endpoint');
    }

    const filters: any = {};
    if (tenantId) filters.tenantId = tenantId;
    if (status) filters.status = status;

    const employees = await this.employeeService.getAllEmployees(filters);
    return { message: 'common.fetched', data: employees };
  }
}
