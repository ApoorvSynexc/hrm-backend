import { IsEmail, IsOptional } from 'class-validator';

export class UpdateContactDto {
  @IsEmail()
  @IsOptional()
  email?: string;
}
