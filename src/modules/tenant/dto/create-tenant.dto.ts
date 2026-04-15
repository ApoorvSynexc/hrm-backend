import {
  IsString,
  IsNotEmpty,
  MaxLength,
  MinLength,
  Matches,
  IsEmail,
} from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @IsEmail()
  @IsNotEmpty()
  adminEmail!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  adminPassword!: string;
}
