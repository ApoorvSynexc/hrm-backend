import { IsString, IsOptional, IsDateString, IsIn, MaxLength } from 'class-validator';

export class UpdateLeaveDto {
  @IsString()
  @IsOptional()
  @IsIn(['ANNUAL', 'SICK', 'CASUAL', 'UNPAID'])
  type?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}
