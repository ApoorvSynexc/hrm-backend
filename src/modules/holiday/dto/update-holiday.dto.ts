import { IsString, IsOptional, IsDateString, IsIn, MaxLength } from 'class-validator';

export class UpdateHolidayDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  @IsIn(['PUBLIC', 'FESTIVAL', 'OPTIONAL'])
  type?: string;
}
