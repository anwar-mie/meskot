import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateRoleInput, UpdateRolePermissionsInput } from '@meskot/shared-schemas';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async listRoles() {
    const roles = await this.prisma.role.findMany({
      include: {
        _count: { select: { users: true } },
        permissions: { include: { permission: true } },
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });

    return roles.map((role) => ({
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      employeeCount: role._count.users,
      permissions: role.permissions.map((rp) => rp.permission.code),
    }));
  }

  async listPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
    });
  }

  async createRole(input: CreateRoleInput, actorId: string) {
    const existing = await this.prisma.role.findUnique({ where: { code: input.code } });
    if (existing) {
      throw new ConflictException(`Role code ${input.code} already exists`);
    }

    const perms = input.permissionCodes.length
      ? await this.prisma.permission.findMany({
          where: { code: { in: input.permissionCodes } },
        })
      : [];

    const role = await this.prisma.role.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
        isSystem: false,
        permissions: {
          create: perms.map((p) => ({ permissionId: p.id })),
        },
      },
      include: {
        _count: { select: { users: true } },
        permissions: { include: { permission: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'ROLE_CREATED',
        entityType: 'Role',
        entityId: role.id,
        afterData: { code: role.code, name: role.name, permissions: input.permissionCodes },
      },
    });

    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      employeeCount: role._count.users,
      permissions: role.permissions.map((rp) => rp.permission.code),
    };
  }

  async updateRolePermissions(
    roleId: string,
    input: UpdateRolePermissionsInput,
    actorId: string,
  ) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: { permissions: { include: { permission: true } } },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const beforeCodes = role.permissions.map((rp) => rp.permission.code).sort();
    const targetPermissions = await this.prisma.permission.findMany({
      where: { code: { in: input.permissionCodes } },
    });
    const afterCodes = targetPermissions.map((p) => p.code).sort();

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      this.prisma.rolePermission.createMany({
        data: targetPermissions.map((p) => ({ roleId, permissionId: p.id })),
      }),
      this.prisma.auditLog.create({
        data: {
          actorId,
          action: 'ROLE_PERMISSIONS_UPDATED',
          entityType: 'Role',
          entityId: roleId,
          beforeData: { permissions: beforeCodes },
          afterData: { permissions: afterCodes },
        },
      }),
    ]);

    return {
      id: role.id,
      code: role.code,
      name: role.name,
      permissions: afterCodes,
    };
  }
}
