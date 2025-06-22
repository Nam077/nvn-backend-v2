import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { RedisModule } from '@/modules/redis/redis.module';
import { SecurityModule } from '@/modules/security/security.module';
import { UsersModule } from '@/modules/users/users.module';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DynamicJwtAuthGuard } from './guards/dynamic-jwt-auth.guard';
import { DynamicJwtStrategy } from './strategies/dynamic-jwt.strategy';

@Module({
    imports: [
        UsersModule,
        SecurityModule,
        RedisModule,
        PassportModule,
        JwtModule.register({
            // JWT module sẽ được cấu hình động trong AuthService
            signOptions: {
                issuer: 'nvn-backend',
                audience: 'nvn-users',
            },
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, DynamicJwtStrategy, DynamicJwtAuthGuard],
    exports: [AuthService, DynamicJwtAuthGuard],
})
export class AuthModule {}
