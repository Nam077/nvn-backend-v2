import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PassportStrategy } from '@nestjs/passport';

import { Request } from 'express';
import { isObject, has, isString, get } from 'lodash';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { KeyManagerService } from '@/modules/security/services/key-manager.service';

interface JwtPayload {
    sub: string;
    email: string;
    role: string;
    type: string;
    keyId: string;
    jti: string;
    iat?: number;
    exp?: number;
    iss?: string;
    aud?: string;
}

const isValidDecodedPayload = (payload: unknown): payload is { keyId: string } =>
    isObject(payload) && payload !== null && has(payload, 'keyId') && isString(get(payload, 'keyId'));

@Injectable()
export class DynamicJwtStrategy extends PassportStrategy(Strategy, 'dynamic-jwt') {
    constructor(
        private readonly keyManagerService: KeyManagerService,
        private readonly jwtService: JwtService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKeyProvider: (
                request: Request,
                rawJwtToken: string,
                done: (error: any, secret?: string) => void,
            ) => {
                try {
                    // Decode token to get keyId without verification
                    const decoded = this.jwtService.decode<JwtPayload>(rawJwtToken);
                    if (!isValidDecodedPayload(decoded)) {
                        return done(new UnauthorizedException('Invalid token format'));
                    }

                    // Get the specific public key used to create this token
                    this.keyManagerService
                        .getPublicKey(decoded.keyId)
                        .then((publicKey) => {
                            if (!publicKey) {
                                return done(new UnauthorizedException('Key not found or revoked'));
                            }
                            return done(null, publicKey);
                        })
                        .catch((error) => done(error));
                } catch {
                    return done(new UnauthorizedException('Invalid token format'));
                }
            },
            issuer: 'nvn-backend',
            audience: 'nvn-users',
            algorithms: ['RS256'],
        });
    }

    validate(payload: JwtPayload) {
        if (payload.type !== 'access') {
            throw new UnauthorizedException('Invalid token type');
        }

        return {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
        };
    }
}
