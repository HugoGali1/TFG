import { IsMongoId, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChooseBuffetDto {
  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  buffetId: string;
}
