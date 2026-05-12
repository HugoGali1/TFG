import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WaiterRequestsService } from './waiter-requests.service';
import { WaiterRequestsController } from './waiter-requests.controller';
import { WaiterRequest, WaiterRequestSchema } from './schemas/waiter-request.schema';
import { SessionsModule } from '../sessions/sessions.module';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: WaiterRequest.name, schema: WaiterRequestSchema }]),
    SessionsModule,
    GatewayModule,
  ],
  controllers: [WaiterRequestsController],
  providers: [WaiterRequestsService],
})
export class WaiterRequestsModule {}
