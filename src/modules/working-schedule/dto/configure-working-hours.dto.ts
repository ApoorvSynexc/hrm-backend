import { IsArray, IsInt, IsString, Max, Min } from 'class-validator';

export class ConfigureWorkingHoursDto {
  @IsInt()
  @Min(240)
  @Max(600)
  workingHoursPerDay: number;

  @IsArray()
  @IsString({ each: true })
  workingDays: string[];
}
