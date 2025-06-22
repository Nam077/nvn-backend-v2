import { ApiProperty } from '@nestjs/swagger';

import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
    @ApiProperty({ description: 'User email', example: 'sysadmin@nvn.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ description: 'User password', example: 'SysAdmin123!' })
    @IsString()
    @MinLength(6)
    password: string;
}
