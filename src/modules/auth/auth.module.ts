import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from '@/modules/auth/auth.controller';
import { AuthService } from '@/modules/auth/auth.service';
import { JwtStrategy } from '@/modules/auth/strategies/jwt.strategy';
import { ConfigServiceApp } from '@/modules/config/config.service';
import { UsersModule } from '@/modules/users/users.module';

@Module({
    imports: [
        UsersModule,
        PassportModule,
        JwtModule.registerAsync({
            useFactory: (configService: ConfigServiceApp) => ({
                secret: configService.jwtSecret,
                signOptions: { expiresIn: configService.jwtExpiresIn },
            }),
            inject: [ConfigServiceApp],
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy],
    exports: [AuthService],
})
export class AuthModule {}
