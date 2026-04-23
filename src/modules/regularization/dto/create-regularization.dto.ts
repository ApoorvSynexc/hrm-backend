import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRegularizationDto {
  @IsDateString()
  date: string;

  @IsDateString()
  @IsOptional()
  requestedCheckIn?: string;

  @IsDateString()
  @IsOptional()
  requestedCheckOut?: string;

  @IsString()
  @MaxLength(500)
  reason: string;
}
