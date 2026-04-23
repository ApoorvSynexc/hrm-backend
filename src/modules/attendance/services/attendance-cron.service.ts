import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AttendanceRepository } from '../repositories/index.js';

@Injectable()
export class AttendanceCronService {
  private readonly logger = new Logger(AttendanceCronService.name);

  constructor(private attendanceRepository: AttendanceRepository) {}

  @Cron('59 23 * * *', { name: 'finalize-daily-attendance' })
  async finalizeDailyAttendance() {
    const today = new Date();
    this.logger.log(`Running attendance finalization for ${today.toDateString()}`);

    const pendingRecords = await this.attendanceRepository.findUnfinalizedByDate(today);
    let processed = 0;

    for (const record of pendingRecords) {
      try {
        await this.processRecord(record);
        processed++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to finalize attendance ${record.id}: ${message}`);
      }
    }

    this.logger.log(`Finalized ${processed}/${pendingRecords.length} attendance records`);
  }

  private async processRecord(record: any) {
    const schedule = record.user?.workingSchedule;
    const fullDayThreshold = schedule?.fullDayMinimumMinutes ?? 480;
    const halfDayThreshold = schedule?.halfDayMinimumMinutes ?? 240;
    const totalMinutes = record.totalMinutes ?? 0;

    let status: string;
    if (totalMinutes >= fullDayThreshold) {
      status = 'PRESENT';
    } else if (totalMinutes >= halfDayThreshold) {
      status = 'HALF_DAY';
    } else {
      status = 'ABSENT';
    }

    const isLate = this.computeIsLate(record.firstCheckIn, schedule);

    await this.attendanceRepository.update(record.id, {
      status,
      isLate,
      isFinalStatus: true,
    });
  }

  private computeIsLate(firstCheckIn: Date | null, schedule: any): boolean {
    if (!firstCheckIn || !schedule?.lateMarkAfter) return false;

    const timezone = schedule.timezone ?? 'UTC';
    const graceMinutes = schedule.graceTimeInMinutes ?? 0;

    const [lateHour, lateMin] = (schedule.lateMarkAfter as string).split(':').map(Number);
    const lateThresholdMinutes = lateHour * 60 + lateMin + graceMinutes;

    const checkInLocal = new Date(
      new Date(firstCheckIn).toLocaleString('en-US', { timeZone: timezone }),
    );
    const checkInMinutes = checkInLocal.getHours() * 60 + checkInLocal.getMinutes();

    return checkInMinutes > lateThresholdMinutes;
  }
}
