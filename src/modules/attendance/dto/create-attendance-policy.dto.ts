import { IsEnum, IsString, IsOptional, IsNumber, Min, IsArray, ValidateNested, IsISO8601, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

enum AttendancePolicyType {
  STRICT = 'STRICT',
  FLEXIBLE = 'FLEXIBLE',
}

enum PolicyScopeLevel {
  TENANT = 'TENANT',
  DEPARTMENT = 'DEPARTMENT',
  ROLE = 'ROLE',
  USER = 'USER',
  TEAM = 'TEAM',
}

class IpRangeDto {
  @IsString()
  start!: string; // e.g., "192.168.1.0"

  @IsString()
  end!: string; // e.g., "192.168.1.255"
}

export class CreateAttendancePolicyDto {
  @IsString()
  name!: string; // e.g., "Engineering Strict", "Sales Flexible"

  @IsString()
  @IsOptional()
  description?: string;

  // SCOPE
  @IsEnum(PolicyScopeLevel)
  @IsOptional()
  scopeLevel?: PolicyScopeLevel; // Default: TENANT

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  roleId?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  teamId?: string;

  // RULES
  @IsEnum(AttendancePolicyType)
  @IsOptional()
  policyType?: AttendancePolicyType; // Default: FLEXIBLE

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

  // VERSIONING
  @IsISO8601()
  @IsOptional()
  validFrom?: string; // ISO date string

  @IsISO8601()
  @IsOptional()
  validUntil?: string; // ISO date string, null = indefinite

  @IsBoolean()
  @IsOptional()
  isActive?: boolean; // Default: true
}
