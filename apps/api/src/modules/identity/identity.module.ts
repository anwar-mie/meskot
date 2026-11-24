import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [AuthController, RolesController, UsersController],
  providers: [AuthService, RolesService, UsersService],
  exports: [AuthService, RolesService, UsersService],
})
export class IdentityModule {}
