import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PassportStrategy } from '@nestjs/passport';

import { Request } from 'express';
import { get, isEmpty } from 'lodash';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { SessionService } from '@/modules/auth/services/session.service';
import { KeyManagerService } from '@/modules/security/services/key-manager.service';

interface JwtPayload {
    sub: string;
    email: string;
    role?: string;
    type: string;
    jti: string;
    sid: string;
    iat?: number;
    exp?: number;
    iss?: string;
    aud?: string;
}

export interface RefreshTokenUser {
    id: string;
    email: string;
    role?: string;
    jti: string;
    sid: string;
    sessionData: {
        sid: string;
        id: string;
        email: string;
        firstName?: string;
        lastName?: string;
        isActive: boolean;
        emailVerified: boolean;
        permissions: string[];
        roles: Array<{ id: string; name: string; displayName?: string }>;
        accessTokenJti: string;
        refreshTokenJti: string;
        accessTokenExpiry: Date;
        refreshTokenExpiry: Date;
        createdAt: Date;
        lastUsedAt: Date;
    };
}

const REFRESH_TOKEN_COOKIE_NAME = 'nvn_refresh_token';
const JWT_ISSUER = 'nvn-backend';
const JWT_AUDIENCE = 'nvn-users';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
    constructor(
        private readonly keyManagerService: KeyManagerService,
        private readonly sessionService: SessionService,
        private readonly jwtService: JwtService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req: Request) => get(req, ['cookies', REFRESH_TOKEN_COOKIE_NAME]) as string | null,
            ]),
            ignoreExpiration: false,
            secretOrKeyProvider: JwtRefreshStrategy.secretOrKeyProvider(keyManagerService, jwtService),
            algorithms: ['RS256'],
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE,
            passReqToCallback: true, // Pass request to validate method to access refresh token
        });
    }

    static secretOrKeyProvider(
        keyManagerService: KeyManagerService,
        jwtService: JwtService,
    ): (request: any, rawJwtToken: string, done: (error: any, key?: string) => void) => void {
        return (request: any, rawJwtToken: string, done: (error: any, key?: string) => void): void => {
            try {
                const decodedToken = jwtService.decode<JwtPayload>(rawJwtToken, { complete: true });

                if (isEmpty(decodedToken)) {
                    return done(new UnauthorizedException('Invalid token format'), undefined);
                }

                const keyId = get(decodedToken, 'header.kid');

                keyManagerService
                    .getPublicKey(keyId)
                    .then((publicKey) => {
                        if (!publicKey) {
                            return done(new UnauthorizedException('Refresh token key not found or revoked'), undefined);
                        }
                        done(null, publicKey);
                    })
                    .catch(() => {
                        done(new UnauthorizedException('Failed to retrieve key'), undefined);
                    });
            } catch {
                done(new UnauthorizedException('Invalid refresh token format'), undefined);
            }
        };
    }

    async validate(request: Request, payload: JwtPayload): Promise<RefreshTokenUser> {
        // 1. Verify token type
        if (get(payload, 'type') !== 'refresh') {
            throw new UnauthorizedException('Invalid token type - expected refresh token');
        }

        // 2. Session validation using SID from JWT
        const sessionData = await this.sessionService.validateSession({
            sessionId: get(payload, 'sid'),
            jti: get(payload, 'jti'),
            type: 'refresh',
            userId: get(payload, 'sub'),
        });
        if (!sessionData) throw new UnauthorizedException('Session not found or expired');

        return {
            id: get(payload, 'sub'),
            email: get(payload, 'email'),
            role: get(payload, 'role'),
            jti: get(payload, 'jti'),
            sid: get(payload, 'sid'),
            sessionData, // ✅ Return session data directly from strategy
        };
    }
}
