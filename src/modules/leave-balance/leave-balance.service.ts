import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { LeaveBalanceRepository } from './repositories/leave-balance.repository.js';
import { AllocateLeaveDto } from './dto/index.js';

@Injectable()
export class LeaveBalanceService {
  constructor(private leaveBalanceRepository: LeaveBalanceRepository) {}

  async allocateLeaveBalance(tenantId: string, userId: string, dto: AllocateLeaveDto) {
    if (dto.year < 2020 || dto.year > 2100) {
      throw new BadRequestException('Invalid year');
    }

    const existingBalance = await this.leaveBalanceRepository.find({
      tenantId,
      userId,
      year: dto.year,
      leaveType: dto.leaveType,
    });

    if (existingBalance) {
      throw new BadRequestException('Leave balance already allocated for this year and type');
    }

    return this.leaveBalanceRepository.create({
      tenantId,
      userId,
      year: dto.year,
      leaveType: dto.leaveType,
      totalDays: dto.totalDays,
      usedDays: 0,
      remainingDays: dto.totalDays,
    });
  }

  async getLeaveBalance(tenantId: string, userId: string, year: number, leaveType?: string) {
    const where: any = { tenantId, userId, year };
    if (leaveType) where.leaveType = leaveType;

    if (leaveType) {
      return this.leaveBalanceRepository.find(where);
    }

    return this.leaveBalanceRepository.findAll(where);
  }

  async getMyLeaveBalance(tenantId: string, userId: string, year: number) {
    const result = await this.leaveBalanceRepository.findAll({
      tenantId,
      userId,
      year,
    });
    return result;
  }

  async deductLeaveBalance(tenantId: string, userId: string, leaveType: string, days: number) {
    const currentYear = new Date().getFullYear();

    const balance = await this.leaveBalanceRepository.find({
      tenantId,
      userId,
      year: currentYear,
      leaveType,
    });

    if (!balance) {
      throw new BadRequestException(`No leave balance found for ${leaveType} in ${currentYear}`);
    }

    if (balance.remainingDays < days) {
      throw new BadRequestException(
        `Insufficient leave balance. Remaining: ${balance.remainingDays}, Requested: ${days}`,
      );
    }

    const newUsedDays = balance.usedDays + days;
    const newRemainingDays = balance.remainingDays - days;

    return this.leaveBalanceRepository.update(
      { id: balance.id },
      {
        usedDays: newUsedDays,
        remainingDays: newRemainingDays,
      },
    );
  }

  async creditLeaveBalance(tenantId: string, userId: string, leaveType: string, days: number) {
    const currentYear = new Date().getFullYear();

    const balance = await this.leaveBalanceRepository.find({
      tenantId,
      userId,
      year: currentYear,
      leaveType,
    });

    if (!balance) {
      throw new BadRequestException(`No leave balance found for ${leaveType} in ${currentYear}`);
    }

    const newUsedDays = Math.max(0, balance.usedDays - days);
    const newRemainingDays = balance.totalDays - newUsedDays;

    return this.leaveBalanceRepository.update(
      { id: balance.id },
      {
        usedDays: newUsedDays,
        remainingDays: newRemainingDays,
      },
    );
  }

  async getAllBalances(tenantId: string, year?: number, options?: { limit?: number; page?: number }) {
    const where: any = { tenantId };
    if (year) where.year = year;

    return this.leaveBalanceRepository.findAll(where, options);
  }

  async getEmployeeBalances(tenantId: string, userId: string, options?: { limit?: number; page?: number }) {
    return this.leaveBalanceRepository.findAll(
      { tenantId, userId },
      options,
    );
  }

  async updateLeaveBalance(tenantId: string, userId: string, year: number, leaveType: string, totalDays: number) {
    const balance = await this.leaveBalanceRepository.find({
      tenantId,
      userId,
      year,
      leaveType,
    });

    if (!balance) {
      throw new NotFoundException('Leave balance not found');
    }

    const usedDaysToKeep = Math.min(balance.usedDays, totalDays);
    const newRemainingDays = totalDays - usedDaysToKeep;

    return this.leaveBalanceRepository.update(
      { id: balance.id },
      {
        totalDays,
        remainingDays: newRemainingDays,
      },
    );
  }
}
