import {
  Controller,
  Post,
  Delete,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RegularizationService } from './regularization.service.js';
import { CreateRegularizationDto } from './dto/index.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Permissions } from '../../common/decorators/permissions.decorator.js';

@Controller('regularizations')
export class RegularizationController {
  constructor(private regularizationService: RegularizationService) {}

  /**
   * POST /regularizations
   * Employee submits a new regularization request.
   * The approval workflow is automatically started by the service.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions('create:attendance_regularization')
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateRegularizationDto,
  ) {
    const regularization = await this.regularizationService.create(tenantId, userId, dto);
    return { message: 'common.created', data: regularization };
  }

  /**
   * DELETE /regularizations?id=xxx
   * Employee cancels their own pending regularization request.
   * All other viewing and approval is done through GET /requests
   */
  @Delete()
  @HttpCode(HttpStatus.OK)
  @Permissions('update:attendance_regularization')
  async cancel(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Query('id') id: string,
  ) {
    const regularization = await this.regularizationService.cancel(tenantId, userId, id);
    return { message: 'common.updated', data: regularization };
  }
}
