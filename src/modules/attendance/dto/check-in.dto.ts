import { IsLatitude, IsLongitude, IsOptional } from 'class-validator';

export class CheckInDto {
  @IsLatitude()
  @IsOptional()
  latitude?: number;

  @IsLongitude()
  @IsOptional()
  longitude?: number;
}
