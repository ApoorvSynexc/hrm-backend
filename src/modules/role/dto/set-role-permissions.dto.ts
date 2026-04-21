import { IsString, IsNotEmpty, IsArray, ArrayMinSize } from 'class-validator';

export class SetRolePermissionsDto {
  @IsString()
  @IsNotEmpty()
  roleId!: string;

  @IsArray()
  @ArrayMinSize(0)
  @IsString({ each: true })
  permissionIds!: string[];
}
