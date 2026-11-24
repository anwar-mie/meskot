import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSION_CODES } from '@meskot/shared-types';
import {
  createRoleSchema,
  updateRolePermissionsSchema,
  type CreateRoleInput,
  type UpdateRolePermissionsInput,
} from '@meskot/shared-schemas';
import { JwtAuthGuard, type RequestWithUser } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { RolesService } from './roles.service';

@ApiTags('Roles & Permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('roles')
  @Permissions(PERMISSION_CODES.ROLES_MANAGE)
  listRoles() {
    return this.rolesService.listRoles();
  }

  @Get('permissions')
  @Permissions(PERMISSION_CODES.ROLES_MANAGE)
  listPermissions() {
    return this.rolesService.listPermissions();
  }

  @Post('roles')
  @Permissions(PERMISSION_CODES.ROLES_MANAGE)
  @UsePipes(new ZodValidationPipe(createRoleSchema))
  createRole(@Body() body: CreateRoleInput, @Req() req: RequestWithUser) {
    return this.rolesService.createRole(body, req.user!.sub);
  }

  @Patch('roles/:id/permissions')
  @Permissions(PERMISSION_CODES.ROLES_MANAGE)
  updateRolePermissions(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateRolePermissionsSchema)) body: UpdateRolePermissionsInput,
    @Req() req: RequestWithUser,
  ) {
    return this.rolesService.updateRolePermissions(id, body, req.user!.sub);
  }
}
