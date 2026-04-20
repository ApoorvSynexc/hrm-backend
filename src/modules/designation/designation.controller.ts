import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Put,
} from '@nestjs/common';
import { DesignationService } from './designation.service.js';
import { CreateDesignationDto, UpdateDesignationDto } from './dto/index.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Permissions } from '../../common/decorators/permissions.decorator.js';

@Controller('designation')
export class DesignationController {
  constructor(private designationService: DesignationService) { }

  /**
   * Create a new designation
   * POST /designation
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions('create:designation')
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateDesignationDto,
  ) {
    const designation = await this.designationService.createDesignation(
      tenantId,
      dto,
    );
    return { message: 'common.created', data: designation };
  }

  /**
   * Get all designations
   * GET /designation/list (list all)
   */
  @Get("list")
  @Permissions('read:designation')
  async list(
    @CurrentUser('tenantId') tenantId: string,
    @Query('id') id?: string,
  ) {
    // If id is provided, return single designation; otherwise list all
    if (id) {
      const designation = await this.designationService.getDesignationById(
        tenantId,
        id,
      );
      return { message: 'common.fetched', data: designation };
    }

    const designations = await this.designationService.getDesignations(tenantId);
    return { message: 'common.fetched', data: designations };
  }

  /**
   * GET /designation?id=xxx (get single)
   */
  @Get()
  @Permissions('read:designation')
  async designation(
    @CurrentUser('tenantId') tenantId: string,
    @Query('id') id: string,
  ) {
    const designation = await this.designationService.getDesignationById(
      tenantId,
      id,
    );
    return { message: 'common.fetched', data: designation };
  }

  /**
   * Update a designation
   * PUT /designation?id=xxx
   */
  @Put()
  @HttpCode(HttpStatus.OK)
  @Permissions('update:designation')
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @Query('id') id: string,
    @Body() dto: UpdateDesignationDto,
  ) {
    const designation = await this.designationService.updateDesignation(
      tenantId,
      id,
      dto,
    );
    return { message: 'common.updated', data: designation };
  }

  /**
   * Delete a designation (soft delete)
   * DELETE /designation?id=xxx
   */
  @Delete()
  @HttpCode(HttpStatus.OK)
  @Permissions('delete:designation')
  async delete(
    @CurrentUser('tenantId') tenantId: string,
    @Query('id') id: string,
  ) {
    const designation = await this.designationService.deleteDesignation(
      tenantId,
      id,
    );
    return { message: 'common.deleted', data: designation };
  }
}
