import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsOptional,
  IsBoolean,
  MaxLength,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateStepDto {
  @IsInt()
  @Min(1)
  stepNumber: number;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsIn(['DIRECT_MANAGER', 'ROLE', 'SPECIFIC_USER'])
  approverType: 'DIRECT_MANAGER' | 'ROLE' | 'SPECIFIC_USER';

  @IsString()
  @IsOptional()
  approverRoleId?: string;

  @IsString()
  @IsOptional()
  approverUserId?: string;

  @IsBoolean()
  @IsOptional()
  isSkippable?: boolean;
}

export class CreateWorkflowDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsIn(['REGULARIZATION', 'LEAVE'])
  module: 'REGULARIZATION' | 'LEAVE';

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStepDto)
  steps: CreateStepDto[];
}
