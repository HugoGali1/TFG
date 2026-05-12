import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FromQrDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  qrCode: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  partySize: number;
}
