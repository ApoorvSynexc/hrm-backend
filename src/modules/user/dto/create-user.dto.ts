import {
  IsString,
  IsNotEmpty,
  IsEmail,
  MinLength,
  IsOptional,
  IsDecimal,
  Min,
  IsDateString,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  roleId?: string;

  // Employee-specific fields (optional)
  @IsString()
  @IsOptional()
  employeeCode?: string;

  @IsString()
  @IsOptional()
  designation?: string;

  @IsDateString()
  @IsOptional()
  hireDate?: string;

  @IsDecimal({ decimal_digits: '1,2' })
  @IsOptional()
  @Min(0)
  salary?: number;

  @IsString()
  @IsOptional()
  departmentId?: string;
}
