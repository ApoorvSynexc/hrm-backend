import { IsString, IsOptional, MaxLength, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateDepartmentDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;

  @Transform(({ value }) => value?.toUpperCase())
  @IsIn(['ACTIVE', 'INACTIVE'])
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE';
}
