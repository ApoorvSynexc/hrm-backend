import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateMobileNumberDto {
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
