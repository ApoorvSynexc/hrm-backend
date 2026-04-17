import { IsNumber, IsNotEmpty, IsIn, IsPositive, IsString } from 'class-validator';

export class AllocateLeaveDto {
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  year: number;

  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  totalDays: number;

  @IsString()
  @IsNotEmpty()
  @IsIn(['ANNUAL', 'SICK', 'CASUAL', 'UNPAID'])
  leaveType: string;
}
