import { IsString, IsNotEmpty, IsIn, IsOptional, MaxLength } from 'class-validator';

export class ApproveLeaveDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['APPROVED', 'REJECTED'])
  status: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  rejectionReason?: string;
}
