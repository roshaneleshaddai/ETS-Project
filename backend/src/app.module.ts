import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './user/user.module';
import { EventsModule } from './events/events.module';
import { AuthModule } from './auth/auth.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { CustomersModule } from './customers/customers.module';
import { LoyaltyDiscountRulesModule } from './loyalty-rule/loyalty-rule.module';
import { LoyaltyMembersModule } from './loyalty-members/loyalty-members.module';
import { LoyaltyTransactionsModule } from './loyalty-transactions/loyalty-transactions.module';
import { OrdersModule } from './orders/orders.module';
import { RefundsModule } from './refunds/refunds.module';
import { ScansModule } from './scans/scans.module';
import { SeatsModule } from './event-seats/event-seats.module';
import { TicketsModule } from './tickets/tickets.module';
import { WalletsModule } from './wallets/wallets.module';

import { RedisModule } from './redis/redis.module';
import { ZonesModule } from './zones/zones.module';

@Module({
  imports: [
    RedisModule,
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      useFactory: (config: ConfigService) => {
        // const uri = config.get<string>('DB_URI');
        const uri = "mongodb+srv://neerajagurram777_db_user:nVM8v6FYYpUVoQdm@cluster0.ugip8wc.mongodb.net/ETS_DB"
        if (!uri) {
          throw new Error('DB_URI is not defined');
        }
        console.log('Db fetched');
        return { uri };
      },
      inject: [ConfigService],
    }),
    UserModule,
    EventsModule,
    AuthModule,
    AuditLogsModule,
    CustomersModule,
    LoyaltyDiscountRulesModule,
    LoyaltyMembersModule,
    LoyaltyTransactionsModule,
    OrdersModule,
    RefundsModule,
    ScansModule,
    SeatsModule,
    TicketsModule,
    WalletsModule,
    ZonesModule,
  ],
  providers: [],
})
export class AppModule { }
