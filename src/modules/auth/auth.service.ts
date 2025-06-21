import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { omit } from 'lodash';

import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
    ) {}

    async login(loginDto: LoginDto): Promise<AuthResponseDto> {
        const user = await this.usersService.validatePassword(loginDto.email, loginDto.password);

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };

        const accessToken = this.jwtService.sign(payload);
        const userWithoutPassword = omit(user.toJSON(), 'password');

        return {
            accessToken,
            tokenType: 'Bearer',
            expiresIn: 604800,
            user: userWithoutPassword,
        };
    }

    refreshToken(user: User): { accessToken: string } {
        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };

        const accessToken = this.jwtService.sign(payload);
        return { accessToken };
    }
    async register(createUserDto: CreateUserDto): Promise<AuthResponseDto> {
        const user = await this.usersService.create(createUserDto);

        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };

        const accessToken = this.jwtService.sign(payload);
        const userWithoutPassword = omit(user.toJSON(), 'password');

        return {
            accessToken,
            tokenType: 'Bearer',
            expiresIn: 604800,
            user: userWithoutPassword,
        };
    }
}
