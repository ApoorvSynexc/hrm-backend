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
      // Update user - only allow basic personal details
      const updateData: any = {};
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

      // Update contact if provided
      if (dto.contact) {
        let contact = await tx.contact.findUnique({
          where: { userId },
        });

        if (contact) {
          await tx.contact.update({
            where: { userId },
            data: { email: dto.contact.email },
          });
        } else {
          await tx.contact.create({
            data: {
              userId,
              email: dto.contact.email || '',
              isEmailVerified: false,
            },
          });
        }
      }

      // Update mobile number if provided
      if (dto.mobileNumber) {
        const contact = await tx.contact.findUnique({
          where: { userId },
        });

        if (!contact) {
          // Create contact first if it doesn't exist
          await tx.contact.create({
            data: {
              userId,
              email: '',
              isEmailVerified: false,
            },
          });
        }

        const contactData = await tx.contact.findUnique({
          where: { userId },
        });

        let mobileNumber = await tx.mobileNumber.findUnique({
          where: { contactId: contactData!.id },
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
              contactId: contactData!.id,
              dialCode: dto.mobileNumber.dialCode || '',
              iso2: dto.mobileNumber.iso2 || '',
              country: dto.mobileNumber.country || '',
              number: dto.mobileNumber.number || '',
              isVerified: false,
            },
          });
        }
      }

      return updatedUser;
    });
  }
}
