import { IsString, IsOptional, MaxLength, IsEnum } from 'class-validator';
import { Status } from '../../../../generated/prisma/client.js';

export class UpdateDesignationDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;

  @IsEnum(Status)
  @IsOptional()
  status?: Status;
}
