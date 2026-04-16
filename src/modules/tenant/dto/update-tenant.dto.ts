import { IsString, IsOptional, MaxLength, Matches, IsArray } from 'class-validator';

export class UpdateTenantDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  logo?: string; // URL to logo image

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  @Matches(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
    each: true,
    message: 'Each domain must be a valid domain format (e.g., example.com)',
  })
  domains?: string[];
}
