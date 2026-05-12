import { IsEmail, IsEnum, IsMongoId, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../schemas/payment.schema';

export class CreatePaymentIntentDto {
  @ApiProperty()
  @IsMongoId()
  sessionId: string;

  @ApiPropertyOptional({ example: 7.29, description: 'Tip amount in euros' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  tip?: number;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  @IsOptional()
  method?: PaymentMethod;

  @ApiPropertyOptional({ example: 'cliente@email.com' })
  @IsEmail()
  @IsOptional()
  receiptEmail?: string;
}
