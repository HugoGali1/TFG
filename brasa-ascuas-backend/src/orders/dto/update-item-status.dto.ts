import { IsEnum, IsInt, IsMongoId, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../enums/order-status.enum';

export class UpdateItemStatusDto {
  @ApiProperty()
  @IsMongoId()
  orderId: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  itemIndex: number;

  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
