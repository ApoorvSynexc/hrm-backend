import { IsEmail, IsString, IsNotEmpty, MaxLength, IsDateString, IsOptional, IsDecimal } from 'class-validator';

export class CreateEmployeeDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  employeeCode: string;

  @IsString()
  @IsNotEmpty()
  departmentId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  designation: string;

  @IsDateString()
  @IsNotEmpty()
  hireDate: string; // ISO 8601 date string

  @IsDecimal()
  @IsOptional()
  salary?: string; // Store as decimal string to preserve precision
}
