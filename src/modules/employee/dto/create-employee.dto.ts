import { IsEmail, IsString, IsNotEmpty, MaxLength, IsDateString, IsOptional, IsDecimal, MinLength } from 'class-validator';

export class CreateEmployeeDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @IsString()
  @IsNotEmpty()
  departmentId: string;

  @IsString()
  @IsNotEmpty()
  designationId!: string;

  @IsString()
  @IsOptional()
  workingScheduleId?: string;

  @IsString()
  @IsOptional()
  roleId?: string;

  @IsDateString()
  @IsNotEmpty()
  hireDate: string; // ISO 8601 date string

  @IsDecimal()
  @IsOptional()
  salary?: string; // Store as decimal string to preserve precision
}
