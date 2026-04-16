import {
  Controller,
  Get,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UserService } from './user.service.js';
import { UpdateUserDto } from './dto/index.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { Permissions } from '../../common/decorators/permissions.decorator.js';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  /**
   * Get current user's profile
   * GET /users/my-profile
   */
  @Get('my-profile')
  @Permissions('read:user')
  async getProfile(@CurrentUser() current: JwtPayload) {
    return await this.userService.getUserById(current.sub);
  }

  /**
   * Update current user's profile
   * PATCH /users/my-profile
   */
  @Patch('my-profile')
  @HttpCode(HttpStatus.OK)
  @Permissions('update:user')
  async updateProfile(
    @CurrentUser() current: JwtPayload,
    @Body() dto: UpdateUserDto,
  ) {
    return await this.userService.updateUser(current.sub, dto);
  }
}
