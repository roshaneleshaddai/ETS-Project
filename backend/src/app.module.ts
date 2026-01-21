import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './user/user.module';
import { EventsModule } from './events/events.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      useFactory: (config: ConfigService) => {
        const uri = config.get<string>('DB_URI');
        if (!uri) {
          throw new Error('DB_URI is not defined');
        }
        console.log("Db fetched")
        return { uri };
      },
      inject: [ConfigService],
    }),
    UserModule,
    EventsModule,
    AuthModule,
  ],
})
export class AppModule {}
