import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ProcessStepDto {
  @IsIn(['APPROVED', 'REJECTED'])
  action: 'APPROVED' | 'REJECTED';

  @IsString()
  @IsOptional()
  @MaxLength(500)
  comment?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  rejectionReason?: string;
}
