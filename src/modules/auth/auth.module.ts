import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { SessionService } from '@/modules/auth/services/session.service';
import { SecurityModule } from '@/modules/security/security.module';
import { UsersModule } from '@/modules/users/users.module';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';

/**
 * 🔥 CLEAN AUTH MODULE: Handles auth business logic with Passport strategies
 * Guards use strategies for modular authentication
 */
@Module({
    imports: [
        PassportModule,
        UsersModule, // Import for user validation and RBAC
        SecurityModule, // Import for key management
        JwtModule.register({
            signOptions: {
                issuer: 'nvn-backend',
                audience: 'nvn-users',
            },
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, SessionService, JwtAccessStrategy, JwtRefreshStrategy, JwtService],
    exports: [AuthService],
})
export class AuthModule {}
