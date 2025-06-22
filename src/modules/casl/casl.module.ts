import { Global, Module } from '@nestjs/common';

import { AuthModule } from '@/modules/auth/auth.module';
import { SessionService } from '@/modules/auth/services/session.service';
import { UsersModule } from '@/modules/users/users.module';

import { AbilityFactory } from './factories/ability.factory';
import { CaslGuard } from './guards/casl.guard';

@Global()
@Module({
    imports: [UsersModule, AuthModule],
    providers: [AbilityFactory, CaslGuard, SessionService],
    exports: [AbilityFactory, CaslGuard, SessionService],
})
export class CaslModule {}
