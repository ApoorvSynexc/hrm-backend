import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { UserRepository } from '../account/repositories/user.repository.js';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/index.js';

@Injectable()
export class EmployeeService {
  constructor(private userRepository: UserRepository) {}

  /**
   * Create a new employee
   */
  async createEmployee(tenantId: string, dto: CreateEmployeeDto) {
    // Check email uniqueness in tenant
    const existingEmail = await this.userRepository.findByTenantAndEmail(
      tenantId,
      dto.email,
    );

    if (existingEmail) {
      throw new BadRequestException(
        `Email "${dto.email}" is already in use in this tenant`,
      );
    }

    // Check employee code uniqueness in tenant
    const existingCode = await this.userRepository.findByEmployeeCode(
      tenantId,
      dto.employeeCode,
    );

    if (existingCode) {
      throw new BadRequestException(
        `Employee code "${dto.employeeCode}" is already in use`,
      );
    }

    // Create employee
    return await this.userRepository.create({
      tenantId,
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      employeeCode: dto.employeeCode,
      departmentId: dto.departmentId,
      designation: dto.designation,
      hireDate: new Date(dto.hireDate),
      salary: dto.salary ? parseFloat(dto.salary) : null,
      employmentStatus: 'ACTIVE',
      status: 'ACTIVE',
      // Note: password must be set separately in a separate API or flow
      passwordHash: '', // Will be set to a default or temporary password
    });
  }

  /**
   * List all employees in a tenant (excluding deleted)
   */
  async listEmployees(tenantId: string) {
    return await this.userRepository.findManyByTenant(tenantId, {
      status: { not: 'DELETED' },
      employeeCode: { not: null }, // Only actual employees
    });
  }

  /**
   * Get single employee by ID
   */
  async getEmployeeById(tenantId: string, employeeId: string) {
    const employee = await this.userRepository.findByTenantAndId(
      tenantId,
      employeeId,
    );

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (!employee.employeeCode) {
      throw new NotFoundException('User is not an employee');
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
    // Get existing employee to verify it exists and has employee fields
    const employee = await this.getEmployeeById(tenantId, employeeId);

    // Check email uniqueness if being changed
    if (dto.email && dto.email !== employee.email) {
      const existingEmail = await this.userRepository.findByTenantAndEmail(
        tenantId,
        dto.email,
      );

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

    return await this.userRepository.update(employeeId, updateData);
  }

  /**
   * Delete (soft delete) an employee
   */
  async deleteEmployee(tenantId: string, employeeId: string) {
    // Verify employee exists
    await this.getEmployeeById(tenantId, employeeId);

    // Soft delete: mark as DELETED
    return await this.userRepository.update(employeeId, {
      status: 'DELETED',
      employmentStatus: 'TERMINATED',
    });
  }
}
