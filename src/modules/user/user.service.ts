import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import bcrypt from 'bcrypt';
import { CreateUserDto, UpdateUserDto } from './dto/index.js';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new user (admin or employee)
   */
  async createUser(tenantId: string, dto: CreateUserDto) {
    // Verify email doesn't already exist in this tenant
    const existingUser = await this.prisma.user.findFirst({
      where: {
        tenantId,
        email: dto.email,
      },
    });

    if (existingUser) {
      throw new BadRequestException(
        `Email "${dto.email}" is already registered in this organization`,
      );
    }

    // If creating an employee, verify employeeCode uniqueness
    if (dto.employeeCode) {
      const existingEmployee = await this.prisma.user.findFirst({
        where: {
          tenantId,
          employeeCode: dto.employeeCode,
        },
      });

      if (existingEmployee) {
        throw new BadRequestException(
          `Employee code "${dto.employeeCode}" is already in use`,
        );
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create user
    return await this.prisma.user.create({
      data: {
        tenantId,
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        roleId: dto.roleId,
        employeeCode: dto.employeeCode,
        designation: dto.designation,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : null,
        salary: dto.salary ? String(dto.salary) : null,
        departmentId: dto.departmentId,
        status: 'ACTIVE',
      },
      include: {
        role: true,
        department: true,
      },
    });
  }

  /**
   * Get user by ID
   */
  async getUserById(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
      },
      include: {
        role: true,
        department: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Get all users in a tenant
   */
  async getUsers(
    tenantId: string,
    filters?: {
      isEmployee?: boolean; // true = with employeeCode, false = without
    },
  ) {
    const where: any = { tenantId };

    if (filters?.isEmployee === true) {
      where.employeeCode = { not: null };
    } else if (filters?.isEmployee === false) {
      where.employeeCode = null;
    }

    return await this.prisma.user.findMany({
      where,
      include: {
        role: true,
        department: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update user
   */
  async updateUser(
    tenantId: string,
    userId: string,
    dto: UpdateUserDto,
  ) {
    const user = await this.getUserById(tenantId, userId);

    // Check email uniqueness if email is being changed
    if (dto.email && dto.email !== user.email) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          tenantId,
          email: dto.email,
          id: { not: userId },
        },
      });

      if (existingUser) {
        throw new BadRequestException(
          `Email "${dto.email}" is already in use`,
        );
      }
    }

    // Update user
    return await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        roleId: dto.roleId,
        designation: dto.designation,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
        salary: dto.salary ? String(dto.salary) : undefined,
        departmentId: dto.departmentId,
      },
      include: {
        role: true,
        department: true,
      },
    });
  }

  /**
   * Delete user (soft delete - set status to DELETED)
   */
  async deleteUser(tenantId: string, userId: string) {
    const user = await this.getUserById(tenantId, userId);

    // Don't allow deleting users who are reviewed regularizations
    const referencedRegularization = await this.prisma.attendanceRegularization.findFirst({
      where: {
        reviewedByUserId: userId,
      },
    });

    if (referencedRegularization) {
      throw new BadRequestException(
        'Cannot delete user with existing reviewed regularizations. Reassign reviews first.',
      );
    }

    return await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'DELETED' },
      include: {
        role: true,
        department: true,
      },
    });
  }

  /**
   * Change user password
   */
  async changePassword(
    tenantId: string,
    userId: string,
    oldPassword: string,
    newPassword: string,
  ) {
    const user = await this.getUserById(tenantId, userId);

    // Verify old password
    const passwordValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!passwordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    return await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  /**
   * Reset user password (admin only)
   */
  async resetPassword(tenantId: string, userId: string, newPassword: string) {
    await this.getUserById(tenantId, userId);

    const passwordHash = await bcrypt.hash(newPassword, 10);

    return await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  /**
   * Get employees only (users with employeeCode)
   */
  async getEmployees(tenantId: string) {
    return await this.getUsers(tenantId, { isEmployee: true });
  }

  /**
   * Get admin/system users (users without employeeCode)
   */
  async getAdminUsers(tenantId: string) {
    return await this.getUsers(tenantId, { isEmployee: false });
  }
}
