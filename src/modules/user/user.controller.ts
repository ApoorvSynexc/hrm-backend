import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { UserService } from './user.service.js';
import { CreateUserDto, UpdateUserDto } from './dto/index.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  /**
   * Create a new user (admin endpoint)
   * POST /users
   */
  @Post()
  async createUser(@CurrentUser() current: JwtPayload, @Body() dto: CreateUserDto) {
    if (!current.tenantId) {
      throw new BadRequestException('Super admin cannot create tenant users');
    }

    return await this.userService.createUser(current.tenantId, dto);
  }

  /**
   * Get current user's profile
   * GET /users/profile
   */
  @Get('profile')
  async getProfile(@CurrentUser() current: JwtPayload) {
    if (!current.tenantId) {
      throw new BadRequestException('Super admin profile not supported');
    }

    return await this.userService.getUserById(current.tenantId, current.sub);
  }

  /**
   * Get all users in tenant
   * GET /users?isEmployee=true
   */
  @Get()
  async getUsers(
    @CurrentUser() current: JwtPayload,
    @Query('isEmployee') isEmployee?: string,
  ) {
    if (!current.tenantId) {
      throw new BadRequestException('Super admin cannot list tenant users');
    }

    const filters =
      isEmployee === 'true'
        ? { isEmployee: true }
        : isEmployee === 'false'
          ? { isEmployee: false }
          : undefined;

    return await this.userService.getUsers(current.tenantId, filters);
  }

  /**
   * Get user by ID
   * GET /users/:id
   */
  @Get(':id')
  async getUser(
    @CurrentUser() current: JwtPayload,
    @Param('id') userId: string,
  ) {
    if (!current.tenantId) {
      throw new BadRequestException('Super admin cannot access tenant users');
    }

    return await this.userService.getUserById(current.tenantId, userId);
  }

  /**
   * Update user
   * PATCH /users/:id
   */
  @Patch(':id')
  async updateUser(
    @CurrentUser() current: JwtPayload,
    @Param('id') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    if (!current.tenantId) {
      throw new BadRequestException('Super admin cannot update tenant users');
    }

    return await this.userService.updateUser(current.tenantId, userId, dto);
  }

  /**
   * Delete user (soft delete)
   * DELETE /users/:id
   */
  @Delete(':id')
  async deleteUser(
    @CurrentUser() current: JwtPayload,
    @Param('id') userId: string,
  ) {
    if (!current.tenantId) {
      throw new BadRequestException('Super admin cannot delete tenant users');
    }

    return await this.userService.deleteUser(current.tenantId, userId);
  }

  /**
   * Get all employees
   * GET /users/employees/list
   */
  @Get('employees/list')
  async getEmployees(@CurrentUser() current: JwtPayload) {
    if (!current.tenantId) {
      throw new BadRequestException('Super admin cannot list tenant users');
    }

    return await this.userService.getEmployees(current.tenantId);
  }

  /**
   * Get all admin users
   * GET /users/admins/list
   */
  @Get('admins/list')
  async getAdmins(@CurrentUser() current: JwtPayload) {
    if (!current.tenantId) {
      throw new BadRequestException('Super admin cannot list tenant users');
    }

    return await this.userService.getAdminUsers(current.tenantId);
  }
}
