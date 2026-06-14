import { IsIn, IsOptional, IsString } from 'class-validator';

export class ProcessRequestDto {
  @IsIn(['APPROVED', 'REJECTED'])
  action: 'APPROVED' | 'REJECTED';

  @IsString()
  @IsOptional()
  comment?: string;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
