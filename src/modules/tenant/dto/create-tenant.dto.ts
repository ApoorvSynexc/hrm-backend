import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsEmail,
  MinLength,
  IsOptional,
  Matches,
} from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsEmail()
  @IsNotEmpty()
  adminEmail!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  adminPassword!: string;

  @IsString()
  @IsOptional()
  @Matches(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
    message: 'domain must be a valid domain format (e.g., example.com)',
  })
  domain?: string;
}
