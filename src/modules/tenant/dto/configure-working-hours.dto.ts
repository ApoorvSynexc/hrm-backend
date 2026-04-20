import { IsInt, IsArray, IsString, Min, Max } from 'class-validator';

export class ConfigureWorkingHoursDto {
  @IsInt()
  @Min(240)
  @Max(600)
  workingHoursPerDay: number;

  @IsArray()
  @IsString({ each: true })
  workingDays: string[];
}

export class ConfigureWorkingDaysDto {
  @IsArray()
  @IsString({ each: true })
  workingDays: string[];
}
