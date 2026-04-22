import { IsEnum, IsString, IsOptional, IsNumber, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

enum AttendancePolicyType {
  STRICT = 'STRICT',
  FLEXIBLE = 'FLEXIBLE',
}

class IpRangeDto {
  @IsString()
  start!: string; // e.g., "192.168.1.0"

  @IsString()
  end!: string; // e.g., "192.168.1.255"
}

export class CreateAttendancePolicyDto {
  @IsEnum(AttendancePolicyType)
  policyType!: AttendancePolicyType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IpRangeDto)
  @IsOptional()
  ipRanges?: IpRangeDto[]; // Multiple IP ranges for multiple routers

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  wifiSsids?: string[]; // Array of office WiFi SSIDs

  @IsNumber()
  @IsOptional()
  @Min(0)
  radiusMeters?: number;
}
