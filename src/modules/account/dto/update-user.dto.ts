import {
  IsString,
  IsEmail,
  IsOptional,
  IsDateString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class UpdateContactDto {
  @IsEmail()
  @IsOptional()
  email?: string;
}

class UpdateMobileNumberDto {
  @IsString()
  @IsOptional()
  @MaxLength(5)
  dialCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2)
  iso2?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  country?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  number?: string;
}

export class UpdateUserDto {
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
  avatarUrl?: string;

  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  gender?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  maritalStatus?: string;

  @ValidateNested()
  @Type(() => UpdateContactDto)
  @IsOptional()
  contact?: UpdateContactDto;

  @ValidateNested()
  @Type(() => UpdateMobileNumberDto)
  @IsOptional()
  mobileNumber?: UpdateMobileNumberDto;
}
