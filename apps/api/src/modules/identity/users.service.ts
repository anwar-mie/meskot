import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateEmployeeInput, UpdateUserStatusInput } from '@meskot/shared-schemas';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers() {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      include: {
        roles: { include: { role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      status: u.status,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      roles: u.roles.map((r) => ({ code: r.role.code, name: r.role.name })),
    }));
  }

  async createEmployee(input: CreateEmployeeInput, actorId: string) {
    const email = input.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email is already registered');

    const roles = await this.prisma.role.findMany({
      where: { code: { in: input.roleCodes } },
    });
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });

    const user = await this.prisma.user.create({
      data: {
        fullName: input.fullName,
        email,
        phone: input.phone ?? null,
        passwordHash,
        emailVerifiedAt: new Date(),
        roles: {
          create: roles.map((r) => ({ roleId: r.id })),
        },
      },
      include: { roles: { include: { role: true } } },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'EMPLOYEE_CREATED',
        entityType: 'User',
        entityId: user.id,
        afterData: { email: user.email, roles: input.roleCodes },
      },
    });

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      status: user.status,
      roles: user.roles.map((r) => ({ code: r.role.code, name: r.role.name })),
    };
  }

  async updateUserStatus(userId: string, input: UpdateUserStatusInput, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { status: input.status },
      }),
      ...(input.status === 'SUSPENDED'
        ? [
            this.prisma.refreshToken.updateMany({
              where: { userId, revokedAt: null },
              data: { revokedAt: new Date() },
            }),
          ]
        : []),
      this.prisma.auditLog.create({
        data: {
          actorId,
          action: input.status === 'SUSPENDED' ? 'USER_SUSPENDED' : 'USER_REACTIVATED',
          entityType: 'User',
          entityId: userId,
          beforeData: { status: user.status },
          afterData: { status: input.status },
        },
      }),
    ]);

    return { id: userId, status: input.status };
  }
}
