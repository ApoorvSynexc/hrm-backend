import { IsString, IsNotEmpty, IsDateString, IsIn, MaxLength } from 'class-validator';

export class CreateHolidayDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['PUBLIC', 'FESTIVAL', 'OPTIONAL'])
  type: string;
}
