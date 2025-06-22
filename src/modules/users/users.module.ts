import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { RedisModule } from '@/modules/redis/redis.module';
import { User } from '@/modules/users/entities/user.entity';
import { UsersController } from '@/modules/users/users.controller';
import { UsersService } from '@/modules/users/users.service';

@Module({
    imports: [SequelizeModule.forFeature([User]), RedisModule],
    controllers: [UsersController],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule {}
