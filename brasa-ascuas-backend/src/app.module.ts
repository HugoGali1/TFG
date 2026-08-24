import { Module } from '@nestjs/common';
import { existsSync } from 'fs';
import { join } from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';
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

/**
 * Carpeta con el build de la app Ionic. En el despliegue de un solo servicio
 * (Render) el backend sirve tambien el frontend, de modo que la API y la web
 * comparten origen y los websockets no necesitan CORS.
 * Si la carpeta no existe (desarrollo con `ng serve`), no se registra nada.
 */
const STATIC_DIR = process.env.STATIC_DIR
  ? join(process.cwd(), process.env.STATIC_DIR)
  : join(__dirname, '..', '..', 'brasa-ascuas-app', 'www');

const staticImports = existsSync(STATIC_DIR)
  ? [
      ServeStaticModule.forRoot({
        rootPath: STATIC_DIR,
        exclude: ['/api/{*path}'],
      }),
    ]
  : [];

@Module({
  imports: [
    ...staticImports,
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
