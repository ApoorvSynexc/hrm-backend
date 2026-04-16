import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { UserRepository } from './repositories/user.repository.js';
import { UpdateUserDto } from './dto/index.js';

@Injectable()
export class AccountService {
  constructor(private userRepository: UserRepository) {}

  /**
   * Get user by ID (works for both tenant and super admin users)
   */
  async getUserById(userId: string) {
    const user = await this.userRepository.findByIdWithRole(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Update user profile (works for both tenant and super admin users)
   */
  async updateUser(
    userId: string,
    dto: UpdateUserDto,
  ) {
    const user = await this.getUserById(userId);

    // Check email uniqueness if email is being changed
    if (dto.email && dto.email !== user.email) {
      const existingUser = await this.userRepository.findFirst({
        email: dto.email,
        id: { not: userId },
      });

      if (existingUser) {
        throw new BadRequestException(
          `Email "${dto.email}" is already in use`,
        );
      }
    }

    // Update user
    return await this.userRepository.update(userId, {
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
    });
  }
}
