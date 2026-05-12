import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Buffet, BuffetSchema } from './schemas/buffet.schema';
import { BuffetService } from './buffet.service';
import { BuffetController } from './buffet.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Buffet.name, schema: BuffetSchema }])],
  controllers: [BuffetController],
  providers: [BuffetService],
  exports: [BuffetService, MongooseModule],
})
export class BuffetModule {}
