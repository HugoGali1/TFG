import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../enums/role.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'marta@brasaascuas.es' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Marta García' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'securepassword123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ enum: Role, default: Role.WAITER })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
