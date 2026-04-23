import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewRegularizationDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @IsString()
  @IsOptional()
  @MaxLength(500)
  rejectionReason?: string;
}
