import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { EmployeeRepository } from './repositories/employee.repository.js';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/index.js';
import { Status, EmploymentStatus } from '../../../generated/prisma/client.js';

@Injectable()
export class EmployeeService {
  constructor(
    private employeeRepository: EmployeeRepository,
    private prisma: PrismaService,
  ) {}

  /**
   * Create a new employee
   */
  async createEmployee(tenantId: string, dto: CreateEmployeeDto) {
    // Check email uniqueness in tenant
    const existingEmail = await this.employeeRepository.find({
      tenantId,
      email: dto.email,
    });

    if (existingEmail) {
      throw new BadRequestException(
        `Email "${dto.email}" is already in use in this tenant`,
      );
    }

    // Verify department belongs to tenant
    const department = await this.prisma.department.findUnique({
      where: { id: dto.departmentId },
    });

    if (!department || department.tenantId !== tenantId) {
      throw new BadRequestException(
        'Department does not exist or does not belong to this tenant',
      );
    }

    // Verify designation belongs to tenant
    const designation = await this.prisma.designation.findUnique({
      where: { id: dto.designationId },
    });

    if (!designation || designation.tenantId !== tenantId) {
      throw new BadRequestException(
        'Designation does not exist or does not belong to this tenant',
      );
    }

    // Auto-generate employee code
    const employeeCode = await this.employeeRepository.getNextEmployeeCode(tenantId, 'employee');

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Verify reporting manager belongs to this tenant if provided
    if (dto.reportingManagerId) {
      const manager = await this.prisma.user.findFirst({
        where: { id: dto.reportingManagerId, tenantId, status: { not: Status.DELETED } },
      });
      if (!manager) {
        throw new BadRequestException('Reporting manager not found in this tenant');
      }
    }

    // Create employee
    return await this.employeeRepository.create({
      tenantId,
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      employeeCode,
      departmentId: dto.departmentId,
      designationId: dto.designationId,
      workingScheduleId: dto.workingScheduleId || null,
      roleId: dto.roleId,
      hireDate: new Date(dto.hireDate),
      salary: dto.salary ? parseFloat(dto.salary) : null,
      reportingManagerId: dto.reportingManagerId || null,
      passwordHash,
      employmentStatus: EmploymentStatus.ACTIVE,
      status: Status.ACTIVE,
    } as any);
  }

  /**
   * List all employees in a tenant (excluding deleted)
   */
  async listEmployees(tenantId: string) {
    const result = await this.employeeRepository.findAll(
      { tenantId, status: { not: Status.DELETED } },
      { pagination: false },
    );
    return result.data;
  }

  /**
   * Get single employee by ID
   */
  async getEmployeeById(tenantId: string, employeeId: string) {
    const employee = await this.employeeRepository.find({
      id: employeeId,
      tenantId,
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  /**
   * Update employee details
   */
  async updateEmployee(
    tenantId: string,
    employeeId: string,
    dto: UpdateEmployeeDto,
  ) {
    // Get existing employee to verify it exists
    const employee = await this.getEmployeeById(tenantId, employeeId);

    // Check email uniqueness if being changed
    if (dto.email && dto.email !== employee.email) {
      const existingEmail = await this.employeeRepository.find({
        tenantId,
        email: dto.email,
      });

      if (existingEmail) {
        throw new BadRequestException(
          `Email "${dto.email}" is already in use in this tenant`,
        );
      }
    }

    // Verify department belongs to tenant if being changed
    if (dto.departmentId !== undefined) {
      const department = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
      });

      if (!department || department.tenantId !== tenantId) {
        throw new BadRequestException(
          'Department does not exist or does not belong to this tenant',
        );
      }
    }

    // Verify designation belongs to tenant if being changed
    if (dto.designationId !== undefined) {
      const designation = await this.prisma.designation.findUnique({
        where: { id: dto.designationId },
      });

      if (!designation || designation.tenantId !== tenantId) {
        throw new BadRequestException(
          'Designation does not exist or does not belong to this tenant',
        );
      }
    }

    // Build update data
    const updateData: any = {};
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.designationId !== undefined) updateData.designationId = dto.designationId;
    if (dto.workingScheduleId !== undefined) updateData.workingScheduleId = dto.workingScheduleId;
    if (dto.departmentId !== undefined) updateData.departmentId = dto.departmentId;
    if (dto.roleId !== undefined) updateData.roleId = dto.roleId;
    if (dto.hireDate !== undefined) updateData.hireDate = new Date(dto.hireDate);
    if (dto.salary !== undefined) updateData.salary = parseFloat(dto.salary);
    if (dto.reportingManagerId !== undefined) {
      if (dto.reportingManagerId === null) {
        updateData.reportingManagerId = null;
      } else {
        if (dto.reportingManagerId === employeeId) {
          throw new BadRequestException('An employee cannot be their own reporting manager');
        }
        const manager = await this.prisma.user.findFirst({
          where: { id: dto.reportingManagerId, tenantId, status: { not: Status.DELETED } },
        });
        if (!manager) {
          throw new BadRequestException('Reporting manager not found in this tenant');
        }
        updateData.reportingManagerId = dto.reportingManagerId;
      }
    }

    return await this.employeeRepository.update({ id: employeeId }, updateData);
  }

  /**
   * Delete (soft delete) an employee
   */
  async deleteEmployee(tenantId: string, employeeId: string) {
    // Verify employee exists
    await this.getEmployeeById(tenantId, employeeId);

    // Soft delete: mark as DELETED
    return await this.employeeRepository.update(
      { id: employeeId },
      {
        status: Status.DELETED,
        employmentStatus: EmploymentStatus.TERMINATED,
      },
    );
  }

  /**
   * Get all employees across all tenants (for super admin) with optional filters and pagination
   */
  async getAllEmployees(
    filters?: { tenantId?: string; status?: string },
    options?: { limit?: number; page?: number },
  ) {
    const where: any = { status: { not: Status.DELETED } };

    if (filters?.tenantId) {
      where.tenantId = filters.tenantId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    return await this.employeeRepository.findAll(where, {
      limit: options?.limit || 10,
      page: options?.page || 1,
    });
  }
}
