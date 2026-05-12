import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TablesModule } from './tables/tables.module';
import { MenuModule } from './menu/menu.module';
import { SessionsModule } from './sessions/sessions.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { FeedbackModule } from './feedback/feedback.module';
import { WaiterRequestsModule } from './waiter-requests/waiter-requests.module';
import { GatewayModule } from './gateway/gateway.module';
import { BuffetModule } from './buffet/buffet.module';
import { StatsModule } from './stats/stats.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),
    GatewayModule,
    AuthModule,
    UsersModule,
    TablesModule,
    MenuModule,
    BuffetModule,
    SessionsModule,
    OrdersModule,
    PaymentsModule,
    FeedbackModule,
    WaiterRequestsModule,
    StatsModule,
  ],
})
export class AppModule {}
