import { IsInt, IsMongoId, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFeedbackDto {
  @ApiProperty()
  @IsMongoId()
  sessionId: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'Todo estaba increíble, la brasa perfecta' })
  @IsString()
  @IsOptional()
  comment?: string;
}
