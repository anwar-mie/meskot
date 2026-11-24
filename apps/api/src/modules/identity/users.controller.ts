import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSION_CODES } from '@meskot/shared-types';
import {
  createEmployeeSchema,
  updateUserStatusSchema,
  type CreateEmployeeInput,
  type UpdateUserStatusInput,
} from '@meskot/shared-schemas';
import { JwtAuthGuard, type RequestWithUser } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { UsersService } from './users.service';

@ApiTags('Users & Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions(PERMISSION_CODES.USERS_MANAGE)
  listUsers() {
    return this.usersService.listUsers();
  }

  @Post()
  @Permissions(PERMISSION_CODES.USERS_MANAGE)
  createEmployee(
    @Body(new ZodValidationPipe(createEmployeeSchema)) body: CreateEmployeeInput,
    @Req() req: RequestWithUser,
  ) {
    return this.usersService.createEmployee(body, req.user!.sub);
  }

  @Patch(':id/status')
  @Permissions(PERMISSION_CODES.USERS_MANAGE)
  updateStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateUserStatusSchema)) body: UpdateUserStatusInput,
    @Req() req: RequestWithUser,
  ) {
    return this.usersService.updateUserStatus(id, body, req.user!.sub);
  }
}
