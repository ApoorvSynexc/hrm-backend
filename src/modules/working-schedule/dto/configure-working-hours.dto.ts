import { IsArray, IsInt, IsString, Matches, Max, Min } from 'class-validator';

export class ConfigureWorkingHoursDto {
  @IsArray()
  @IsString({ each: true })
  workingDays?: string[]; // e.g., ["MON", "TUE", "WED", "THU", "FRI"]

  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:mm format (e.g., 09:00)',
  })
  startTime?: string; // e.g., "09:00"

  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime must be in HH:mm format (e.g., 17:00)',
  })
  endTime?: string; // e.g., "17:00"

  @IsInt()
  @Min(0)
  @Max(8)
  breakDuration?: number; // hours (0-8)

  @IsInt()
  @Min(240)
  @Max(600)
  workingHoursPerDay?: number; // minutes: 480 = 8 hours, optional
}
