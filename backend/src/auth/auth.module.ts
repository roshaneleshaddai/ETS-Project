import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from '../user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { Customer } from 'src/customers/customers.schema';
import { CustomersModule } from '../customers/customers.module';
@Module({
  imports: [
    UserModule,
    CustomersModule,
    JwtModule.register({
      global: true,
      secret: 'secret', // store this in .env file in production
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
