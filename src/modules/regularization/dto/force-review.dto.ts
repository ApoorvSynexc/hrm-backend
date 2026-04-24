import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ForceReviewDto {
  @IsIn(['APPROVED', 'REJECTED'])
  action: 'APPROVED' | 'REJECTED';

  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}
