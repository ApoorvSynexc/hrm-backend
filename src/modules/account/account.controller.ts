import {
  Controller,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Put,
} from '@nestjs/common';
import { AccountService } from './account.service.js';
import { UpdateUserDto } from './dto/index.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';

@Controller('account')
export class AccountController {
  constructor(private accountService: AccountService) {}

  /**
   * Get current user's profile
   * GET /my-profile
   * No special permission required - accessible to any authenticated user
   */
  @Get("my-profile")
  async getProfile(@CurrentUser() current: JwtPayload) {
    const user = await this.accountService.getUserById(current.sub);
    return { message: 'common.fetched', data: user };
  }

  /**
   * Update current user's profile
   * PATCH /my-profile
   * No special permission required - accessible to any authenticated user
   */
  @Put("my-profile")
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser() current: JwtPayload,
    @Body() dto: UpdateUserDto,
  ) {
    console.log({current});
    
    const user = await this.accountService.updateUser(current.sub, dto);
    return { message: 'common.updated', data: user };
  }
}
