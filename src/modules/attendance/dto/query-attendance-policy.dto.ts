import { IsOptional, IsString, IsEnum } from 'class-validator';

enum PolicyScopeLevel {
  TENANT = 'TENANT',
  DEPARTMENT = 'DEPARTMENT',
  ROLE = 'ROLE',
  USER = 'USER',
  TEAM = 'TEAM',
}

export class QueryAttendancePolicyDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsEnum(PolicyScopeLevel)
  @IsOptional()
  scopeLevel?: PolicyScopeLevel;

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

  @IsString()
  @IsOptional()
  name?: string;
}
