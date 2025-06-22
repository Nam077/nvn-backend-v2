import { Body, Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AuthService } from '@/modules/auth/auth.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}
}
