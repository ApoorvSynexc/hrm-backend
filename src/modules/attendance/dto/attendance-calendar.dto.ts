import { IsOptional, IsNumber, Min, Max } from 'class-validator';

export class AttendanceCalendarQueryDto {
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(12)
  month?: number;

  @IsNumber()
  @IsOptional()
  @Min(1900)
  year?: number;
}
