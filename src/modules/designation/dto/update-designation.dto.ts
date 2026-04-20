import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateDesignationDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;
}
