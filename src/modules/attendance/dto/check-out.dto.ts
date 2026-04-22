import { IsLatitude, IsLongitude, IsOptional } from 'class-validator';

export class CheckOutDto {
  @IsLatitude()
  @IsOptional()
  latitude?: number;

  @IsLongitude()
  @IsOptional()
  longitude?: number;
}
