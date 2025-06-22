import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PassportStrategy } from '@nestjs/passport';

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

export interface AuthenticatedUser {
    id: string;
    email: string;
    role?: string;
    jti: string;
    sid: string;
}

const JWT_ISSUER = 'nvn-backend';
const JWT_AUDIENCE = 'nvn-users';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
    constructor(
        private readonly keyManagerService: KeyManagerService,
        private readonly sessionService: SessionService,
        private readonly jwtService: JwtService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKeyProvider: JwtAccessStrategy.secretOrKeyProvider(keyManagerService, jwtService),
            algorithms: ['RS256'],
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE,
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

                keyManagerService
                    .getPublicKey(get(decodedToken, 'header.kid'))
                    .then((publicKey) => {
                        if (!publicKey) {
                            return done(new UnauthorizedException('Token key not found or revoked'), undefined);
                        }
                        return done(null, publicKey);
                    })
                    .catch(() => done(new UnauthorizedException('Failed to retrieve key'), undefined));
            } catch {
                return done(new UnauthorizedException('Invalid token format'), undefined);
            }
        };
    }

    async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
        // 1. Verify token type
        if (get(payload, 'type') !== 'access') {
            throw new UnauthorizedException('Invalid token type - expected access token');
        }

        // 2. Session validation using SID from JWT
        const sessionData = await this.sessionService.getSessionBySid(payload.sid);
        if (isEmpty(sessionData)) {
            throw new UnauthorizedException('Session not found or expired');
        }

        // 3. Validate JTI matches current access token
        if (get(sessionData, 'accessTokenJti') !== get(payload, 'jti')) {
            throw new UnauthorizedException('Invalid access token - JTI mismatch');
        }

        // 4. Check if session is blacklisted
        if (await this.sessionService.isSessionBlacklisted(sessionData.sid)) {
            throw new UnauthorizedException('Session has been revoked');
        }

        // 5. Check if access token is still valid (not expired)
        if (new Date() > sessionData.accessTokenExpiry) {
            throw new UnauthorizedException('Access token expired');
        }

        return {
            id: get(payload, 'sub'),
            email: get(payload, 'email'),
            role: get(payload, 'role'),
            jti: get(payload, 'jti'),
            sid: get(payload, 'sid'),
        };
    }
}
