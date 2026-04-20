import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DesignationRepository } from './repositories/index.js';
import { CreateDesignationDto, UpdateDesignationDto } from './dto/index.js';

@Injectable()
export class DesignationService {
  constructor(private designationRepository: DesignationRepository) {}

  async createDesignation(tenantId: string, dto: CreateDesignationDto) {
    // Check if designation name already exists for this tenant
    const existingDesignation = await this.designationRepository.findByTenantAndName(
      tenantId,
      dto.name,
    );

    if (existingDesignation) {
      throw new BadRequestException(
        `Designation "${dto.name}" already exists`,
      );
    }

    return await this.designationRepository.create({
      tenantId,
      name: dto.name,
      description: dto.description,
    });
  }

  async getDesignations(tenantId: string) {
    return await this.designationRepository.findManyByTenant(tenantId);
  }

  async getDesignationById(tenantId: string, id: string) {
    const designation = await this.designationRepository.findByTenantAndId(
      tenantId,
      id,
    );

    if (!designation) {
      throw new NotFoundException('Designation not found');
    }

    return designation;
  }

  async updateDesignation(
    tenantId: string,
    id: string,
    dto: UpdateDesignationDto,
  ) {
    const designation = await this.getDesignationById(tenantId, id);

    // Check name uniqueness if name is being changed
    if (dto.name && dto.name !== designation.name) {
      const existingDesignation = await this.designationRepository.findByTenantAndName(
        tenantId,
        dto.name,
      );

      if (existingDesignation) {
        throw new BadRequestException(
          `Designation "${dto.name}" already exists`,
        );
      }
    }

    return await this.designationRepository.update(id, {
      name: dto.name,
      description: dto.description,
      status: dto.status,
    });
  }

  async deleteDesignation(tenantId: string, id: string) {
    await this.getDesignationById(tenantId, id);

    return await this.designationRepository.softDelete(id);
  }
}
