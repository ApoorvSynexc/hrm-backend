import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { UserRepository } from './repositories/user.repository.js';
import { UpdateUserDto } from './dto/index.js';

@Injectable()
export class AccountService {
  constructor(
    private userRepository: UserRepository,
    private prisma: PrismaService,
  ) {}

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
      const existingUser = await this.userRepository.find({
        email: dto.email,
        id: { not: userId },
      });

      if (existingUser) {
        throw new BadRequestException(
          `Email "${dto.email}" is already in use`,
        );
      }
    }

    // Update user in transaction
    return await this.prisma.$transaction(async (tx) => {
      // Build user update data
      const updateData: Record<string, any> = {};
      if (dto.email !== undefined) updateData.email = dto.email;
      if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
      if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
      if (dto.avatarUrl !== undefined) updateData.avatarUrl = dto.avatarUrl;
      if (dto.dateOfBirth !== undefined) updateData.dateOfBirth = new Date(dto.dateOfBirth);
      if (dto.gender !== undefined) updateData.gender = dto.gender;
      if (dto.maritalStatus !== undefined) updateData.maritalStatus = dto.maritalStatus;

      const updatedUser = await this.userRepository.update(
        { id: userId },
        updateData,
        tx,
      );

      // Handle contact and mobile number updates in one pass
      if (dto.contact || dto.mobileNumber) {
        let contact = await tx.contact.findUnique({
          where: { userId },
        });

        // Create contact if it doesn't exist and we need to update contact or mobile
        if (!contact) {
          contact = await tx.contact.create({
            data: {
              userId,
              email: dto.contact?.email || '',
              isEmailVerified: false,
            },
          });
        }

        // Update contact email if provided
        if (dto.contact?.email) {
          await tx.contact.update({
            where: { id: contact.id },
            data: { email: dto.contact.email },
          });
        }

        // Update mobile number if provided
        if (dto.mobileNumber) {
          let mobileNumber = await tx.mobileNumber.findUnique({
            where: { contactId: contact.id },
          });

          if (mobileNumber) {
            await tx.mobileNumber.update({
              where: { id: mobileNumber.id },
              data: {
                dialCode: dto.mobileNumber.dialCode,
                iso2: dto.mobileNumber.iso2,
                country: dto.mobileNumber.country,
                number: dto.mobileNumber.number,
              },
            });
          } else {
            await tx.mobileNumber.create({
              data: {
                contactId: contact.id,
                dialCode: dto.mobileNumber.dialCode || '',
                iso2: dto.mobileNumber.iso2 || '',
                country: dto.mobileNumber.country || '',
                number: dto.mobileNumber.number || '',
                isVerified: false,
              },
            });
          }
        }
      }

      return updatedUser;
    });
  }
}
