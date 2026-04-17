import { IsString, IsNotEmpty, IsDateString, IsIn, IsOptional, MaxLength } from 'class-validator';

export class CreateLeaveDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['ANNUAL', 'SICK', 'CASUAL', 'UNPAID'])
  type: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}
