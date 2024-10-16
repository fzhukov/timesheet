import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { UserModule } from '@user/user.module';
import { options } from './config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { STRATEGIES } from './strategies';
import { GUARDS } from './guards';

@Module({
  controllers: [AuthController],
  providers: [AuthService, ...STRATEGIES, ...GUARDS],
  imports: [
    PassportModule,
    JwtModule.registerAsync(options()),
    UserModule,
    HttpModule,
  ],
})
export class AuthModule {}
