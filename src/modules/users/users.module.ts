import { Logger, Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { RedisModule } from '@/modules/redis/redis.module';
import { RbacController } from '@/modules/users/controllers/rbac.controller';
import { Permission } from '@/modules/users/entities/permission.entity';
import { RolePermission } from '@/modules/users/entities/role-permission.entity';
import { Role } from '@/modules/users/entities/role.entity';
import { UserRole } from '@/modules/users/entities/user-role.entity';
import { User } from '@/modules/users/entities/user.entity';
import { RbacSeederService } from '@/modules/users/seeders/rbac-seeder.service';
import { RbacService } from '@/modules/users/services/rbac.service';
import { UsersController } from '@/modules/users/users.controller';
import { UsersService } from '@/modules/users/users.service';

@Module({
    imports: [SequelizeModule.forFeature([User, Role, Permission, UserRole, RolePermission]), RedisModule],
    controllers: [UsersController, RbacController],
    providers: [UsersService, RbacService, RbacSeederService, Logger],
    exports: [UsersService, RbacService],
})
export class UsersModule {}
