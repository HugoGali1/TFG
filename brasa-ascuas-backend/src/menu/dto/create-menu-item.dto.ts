import {
  IsArray,
  IsBoolean,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMenuItemDto {
  @ApiProperty({ example: 'Chuletón de buey' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Aged ribeye' })
  @IsString()
  @IsOptional()
  nameEn?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  descriptionEn?: string;

  @ApiProperty()
  @IsMongoId()
  category: string;

  @ApiProperty({ example: 28.5 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 14 })
  @IsInt()
  @Min(0)
  @IsOptional()
  cookingTimeMinutes?: number;

  @ApiPropertyOptional({ example: ['TOP', 'PICANTE'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ example: ['Gluten', 'Lácteos'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allergens?: string[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isVegetarian?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isGlutenFree?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isSpicy?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isGrilled?: boolean;

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ example: ['poco', 'medio', 'al_punto', 'hecho'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  cookingLevels?: string[];
}
