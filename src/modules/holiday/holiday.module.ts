import { Module } from '@nestjs/common';
import { HolidayService } from './holiday.service.js';
import { HolidayController } from './holiday.controller.js';
import { HolidayRepository } from './repositories/holiday.repository.js';

@Module({
  controllers: [HolidayController],
  providers: [HolidayService, HolidayRepository],
})
export class HolidayModule {}
