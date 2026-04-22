import { IsEnum, IsString, IsOptional, IsNumber, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

enum AttendancePolicyType {
  STRICT = 'STRICT',
  FLEXIBLE = 'FLEXIBLE',
}

class IpRangeDto {
  @IsString()
  start!: string;

  @IsString()
  end!: string;
}

export class UpdateAttendancePolicyDto {
  @IsEnum(AttendancePolicyType)
  @IsOptional()
  policyType?: AttendancePolicyType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IpRangeDto)
  @IsOptional()
  ipRanges?: IpRangeDto[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  wifiSsids?: string[];

  @IsNumber()
  @IsOptional()
  @Min(0)
  radiusMeters?: number;
}
