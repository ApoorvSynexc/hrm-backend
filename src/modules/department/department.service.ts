import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DepartmentRepository } from './repositories/index.js';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/index.js';

@Injectable()
export class DepartmentService {
  constructor(private departmentRepository: DepartmentRepository) {}

  async createDepartment(tenantId: string, dto: CreateDepartmentDto) {
    // Check if department name already exists for this tenant
    const existingDept = await this.departmentRepository.findByTenantAndName(
      tenantId,
      dto.name,
    );

    if (existingDept) {
      throw new BadRequestException(
        `Department "${dto.name}" already exists`,
      );
    }

    return await this.departmentRepository.create({
      tenantId,
      name: dto.name,
      description: dto.description,
    });
  }

  async getDepartments(tenantId: string) {
    return await this.departmentRepository.findManyByTenant(tenantId);
  }

  async getDepartmentById(tenantId: string, id: string) {
    const dept = await this.departmentRepository.findByTenantAndId(tenantId, id);

    if (!dept) {
      throw new NotFoundException('Department not found');
    }

    return dept;
  }

  async updateDepartment(
    tenantId: string,
    id: string,
    dto: UpdateDepartmentDto,
  ) {
    const dept = await this.getDepartmentById(tenantId, id);

    // Check name uniqueness if name is being changed
    if (dto.name && dto.name !== dept.name) {
      const existingDept = await this.departmentRepository.findByTenantAndName(
        tenantId,
        dto.name,
      );

      if (existingDept) {
        throw new BadRequestException(
          `Department "${dto.name}" already exists`,
        );
      }
    }

    return await this.departmentRepository.update(id, {
      name: dto.name,
      description: dto.description,
    });
  }

  async deleteDepartment(tenantId: string, id: string) {
    await this.getDepartmentById(tenantId, id);

    return await this.departmentRepository.softDelete(id);
  }
}
