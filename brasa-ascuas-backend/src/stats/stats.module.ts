import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { Session, SessionSchema } from '../sessions/schemas/session.schema';
import { Table, TableSchema } from '../tables/schemas/table.schema';
import { Feedback, FeedbackSchema } from '../feedback/schemas/feedback.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Session.name, schema: SessionSchema },
      { name: Table.name, schema: TableSchema },
      { name: Feedback.name, schema: FeedbackSchema },
    ]),
  ],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
