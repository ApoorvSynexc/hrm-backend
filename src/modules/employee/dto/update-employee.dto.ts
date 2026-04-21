import { IsEmail, IsString, IsOptional, MaxLength, IsDateString, IsDecimal } from 'class-validator';

export class UpdateEmployeeDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  firstName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  lastName?: string;

  @IsString()
  @IsOptional()
  designationId?: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  roleId?: string;

  @IsDateString()
  @IsOptional()
  hireDate?: string;

  @IsDecimal()
  @IsOptional()
  salary?: string;
}
