import { IsInt, IsArray, IsString, IsBoolean, Min, Max } from 'class-validator';

export class ConfigureWorkingHoursDto {
  @IsInt()
  @Min(240)
  @Max(600)
  workingHoursPerDay: number;
}

export class ConfigureWorkingDaysDto {
  @IsArray()
  @IsString({ each: true })
  workingDays: string[];
}
