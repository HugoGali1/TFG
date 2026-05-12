import { IsEnum, IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TableZone } from '../schemas/table.schema';

export class CreateTableDto {
  @ApiProperty({ example: 14 })
  @IsInt()
  @Min(1)
  number: number;

  @ApiPropertyOptional({ enum: TableZone, default: TableZone.INTERIOR })
  @IsEnum(TableZone)
  @IsOptional()
  zone?: TableZone;

  @ApiProperty({ example: 4 })
  @IsInt()
  @Min(1)
  capacity: number;
}
