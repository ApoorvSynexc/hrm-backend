import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { HolidayRepository } from './repositories/holiday.repository.js';
import { CreateHolidayDto, UpdateHolidayDto } from './dto/index.js';

@Injectable()
export class HolidayService {
  constructor(private holidayRepository: HolidayRepository) {}

  async createHoliday(tenantId: string, dto: CreateHolidayDto) {
    const holidayDate = new Date(dto.date);

    const existingHoliday = await this.holidayRepository.find({
      tenantId,
      date: holidayDate,
    });

    if (existingHoliday) {
      throw new BadRequestException('Holiday already exists for this date');
    }

    return this.holidayRepository.create({
      tenantId,
      name: dto.name,
      date: holidayDate,
      type: dto.type,
    });
  }

  async getHolidays(tenantId: string, options?: { limit?: number; page?: number }) {
    return this.holidayRepository.findAll({ tenantId }, options);
  }

  async getHolidayById(tenantId: string, id: string) {
    const holiday = await this.holidayRepository.find({ tenantId, id });
    if (!holiday) {
      throw new NotFoundException('Holiday not found');
    }
    return holiday;
  }

  async updateHoliday(tenantId: string, id: string, dto: UpdateHolidayDto) {
    const holiday = await this.getHolidayById(tenantId, id);

    if (dto.date) {
      const newDate = new Date(dto.date);
      const existingHoliday = await this.holidayRepository.find({
        tenantId,
        id: { not: id },
        date: newDate,
      });

      if (existingHoliday) {
        throw new BadRequestException('Holiday already exists for this date');
      }

      await this.holidayRepository.update(
        { id, tenantId },
        { date: newDate },
      );
    }

    if (dto.name) {
      await this.holidayRepository.update(
        { id, tenantId },
        { name: dto.name },
      );
    }

    if (dto.type) {
      await this.holidayRepository.update(
        { id, tenantId },
        { type: dto.type },
      );
    }

    return this.getHolidayById(tenantId, id);
  }

  async deleteHoliday(tenantId: string, id: string) {
    await this.getHolidayById(tenantId, id);
    await this.holidayRepository.delete({ id, tenantId });
    return { message: 'Holiday deleted successfully' };
  }

  async getHolidaysByDateRange(tenantId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return this.holidayRepository.findAll({
      tenantId,
      date: {
        gte: start,
        lte: end,
      },
    });
  }
}
