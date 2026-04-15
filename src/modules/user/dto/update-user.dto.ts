import {
  IsString,
  IsEmail,
  IsOptional,
  IsDecimal,
  Min,
  IsDateString,
} from 'class-validator';

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  roleId?: string;

  // Employee-specific fields
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
