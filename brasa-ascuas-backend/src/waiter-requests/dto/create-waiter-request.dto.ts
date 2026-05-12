import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WaiterRequestType } from '../schemas/waiter-request.schema';

export class CreateWaiterRequestDto {
  @ApiProperty()
  @IsMongoId()
  sessionId: string;

  @ApiProperty({ enum: WaiterRequestType })
  @IsEnum(WaiterRequestType)
  type: WaiterRequestType;

  @ApiPropertyOptional({ example: 'Necesitamos más servilletas por favor' })
  @IsString()
  @IsOptional()
  message?: string;
}
