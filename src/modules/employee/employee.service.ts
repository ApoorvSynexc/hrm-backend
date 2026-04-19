import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { EmployeeRepository } from './repositories/employee.repository.js';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/index.js';
import { Status, EmploymentStatus } from '../../../generated/prisma/client.js';

@Injectable()
export class EmployeeService {
  constructor(private employeeRepository: EmployeeRepository) {}

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

    // Auto-generate employee code
    const employeeCode = await this.employeeRepository.getNextEmployeeCode(tenantId, 'employee');

    // Create employee
    return await this.employeeRepository.create({
      tenantId,
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      employeeCode,
      departmentId: dto.departmentId,
      designation: dto.designation,
      hireDate: new Date(dto.hireDate),
      salary: dto.salary ? parseFloat(dto.salary) : null,
      employmentStatus: EmploymentStatus.ACTIVE,
      status: Status.ACTIVE,
      passwordHash: '',
    });
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

    // Build update data
    const updateData: any = {};
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.designation !== undefined) updateData.designation = dto.designation;
    if (dto.departmentId !== undefined) updateData.departmentId = dto.departmentId;
    if (dto.hireDate !== undefined) updateData.hireDate = new Date(dto.hireDate);
    if (dto.salary !== undefined) updateData.salary = parseFloat(dto.salary);

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
