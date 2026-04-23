import { IsEnum, IsString, IsOptional, IsNumber, Min, IsArray, ValidateNested, IsISO8601, IsBoolean } from 'class-validator';
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
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(AttendancePolicyType)
  @IsOptional()
  policyType?: AttendancePolicyType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IpRangeDto)
  @IsOptional()
  ipRanges?: IpRangeDto[];

  @IsNumber()
  @IsOptional()
  @Min(0)
  radiusMeters?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  wifiSsids?: string[];

  @IsISO8601()
  @IsOptional()
  validUntil?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
