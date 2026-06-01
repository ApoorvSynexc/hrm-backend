import {
  IsString,
  IsEmail,
  IsOptional,
  IsDateString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateContactDto } from './update-contact.dto.js';
import { UpdateMobileNumberDto } from './update-mobile-number.dto.js';

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
