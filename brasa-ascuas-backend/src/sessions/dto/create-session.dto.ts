import { IsInt, IsMongoId, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiProperty()
  @IsMongoId()
  tableId: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  partySize: number;
}
