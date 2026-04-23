import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, Max } from 'class-validator';

export class AttendanceCalendarQueryDto {
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(12)
  month?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1900)
  year?: number;
}
