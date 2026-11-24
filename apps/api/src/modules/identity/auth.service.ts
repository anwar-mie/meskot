import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  LoginInput,
  OtpRequestInput,
  OtpVerifyInput,
  PasswordResetConfirmInput,
  RegisterInput,
} from '@meskot/shared-schemas';
import { ROLE_CODES } from '@meskot/shared-types';

const MAX_OTP_ATTEMPTS = 5;
const OTP_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(input: RegisterInput, meta?: { ip?: string; userAgent?: string }) {
    const email = input.email?.toLowerCase();
    if (email) {
      const existing = await this.prisma.user.findUnique({ where: { email } });
      if (existing) throw new ConflictException('Email is already registered');
    }
    if (input.phone) {
      const existing = await this.prisma.user.findUnique({ where: { phone: input.phone } });
      if (existing) throw new ConflictException('Phone number is already registered');
    }

    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const customerRole = await this.prisma.role.findUnique({
      where: { code: ROLE_CODES.CUSTOMER },
    });

    const user = await this.prisma.user.create({
      data: {
        fullName: input.fullName,
        email: email ?? null,
        phone: input.phone ?? null,
        passwordHash,
        customerProfile: {
          create: {
            defaultPhone: input.phone ?? null,
          },
        },
        ...(customerRole
          ? {
              roles: {
                create: { roleId: customerRole.id },
              },
            }
          : {}),
      },
      include: this.userWithRolesInclude(),
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'AUTH_REGISTER',
        entityType: 'User',
        entityId: user.id,
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
      },
    });

    return this.issueTokenPair(user, meta);
  }

  async login(input: LoginInput, meta?: { ip?: string; userAgent?: string }) {
    const user = await this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [{ email: input.identifier }, { phone: input.identifier }],
      },
      include: this.userWithRolesInclude(),
    });

    if (!user || user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Invalid credentials or suspended account');
    }

    const valid = await argon2.verify(user.passwordHash, input.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'AUTH_LOGIN',
        entityType: 'User',
        entityId: user.id,
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
      },
    });

    return this.issueTokenPair(user, meta);
  }

  async requestOtp(input: OtpRequestInput) {
    const user = await this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [{ email: input.target }, { phone: input.target }],
      },
    });

    const code = String(crypto.randomInt(100000, 999999));
    const codeHash = this.hashToken(code);

    await this.prisma.otpVerification.create({
      data: {
        userId: user?.id ?? null,
        target: input.target,
        purpose: input.purpose,
        codeHash,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });

    // In production, dispatch via SMS/email provider. In dev, log & expose preview for testing.
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[OTP:${input.purpose}] target=${input.target} code=${code}`);
    }

    return {
      sent: true,
      target: input.target,
      expiresInSeconds: OTP_TTL_MS / 1000,
      ...(process.env.NODE_ENV !== 'production' ? { devOtpCode: code } : {}),
    };
  }

  async verifyOtp(input: OtpVerifyInput, meta?: { ip?: string; userAgent?: string }) {
    const record = await this.prisma.otpVerification.findFirst({
      where: {
        target: input.target,
        purpose: input.purpose,
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('Verification code expired. Request a new code.');
    }

    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      throw new BadRequestException('Too many failed attempts. Request a new code.');
    }

    const expectedHash = this.hashToken(input.code);
    if (record.codeHash !== expectedHash) {
      await this.prisma.otpVerification.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      const remaining = Math.max(0, MAX_OTP_ATTEMPTS - (record.attempts + 1));
      throw new BadRequestException(`Invalid verification code. ${remaining} attempts remaining.`);
    }

    if (input.purpose === 'PASSWORD_RESET') {
      return { verified: true, target: input.target };
    }

    await this.prisma.otpVerification.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });

    const user = await this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [{ email: input.target }, { phone: input.target }],
      },
      include: this.userWithRolesInclude(),
    });

    if (!user) {
      return { verified: true, accountExists: false, target: input.target };
    }

    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Account is suspended');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        phoneVerifiedAt: input.target.startsWith('+') ? new Date() : user.phoneVerifiedAt,
        lastLoginAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'AUTH_OTP_LOGIN',
        entityType: 'User',
        entityId: user.id,
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
      },
    });

    const session = await this.issueTokenPair(user, meta);
    return { verified: true, accountExists: true, ...session };
  }

  async confirmPasswordReset(
    input: PasswordResetConfirmInput,
    meta?: { ip?: string; userAgent?: string },
  ) {
    const record = await this.prisma.otpVerification.findFirst({
      where: {
        target: input.target,
        purpose: 'PASSWORD_RESET',
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('Reset code expired. Request a new code.');
    }

    if (record.codeHash !== this.hashToken(input.code)) {
      await this.prisma.otpVerification.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Invalid verification code.');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [{ email: input.target }, { phone: input.target }],
      },
    });

    if (!user) {
      throw new BadRequestException('Account not found.');
    }

    const passwordHash = await argon2.hash(input.newPassword, { type: argon2.argon2id });

    await this.prisma.$transaction([
      this.prisma.otpVerification.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: 'AUTH_PASSWORD_RESET',
          entityType: 'User',
          entityId: user.id,
          ipAddress: meta?.ip,
          userAgent: meta?.userAgent,
        },
      }),
    ]);

    return { reset: true };
  }

  async refresh(rawRefreshToken: string, meta?: { ip?: string; userAgent?: string }) {
    const tokenHash = this.hashToken(rawRefreshToken);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: this.userWithRolesInclude(),
        },
      },
    });

    if (!existing) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (existing.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { familyId: existing.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (existing.expiresAt < new Date() || existing.user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Refresh token expired');
    }

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokenPair(existing.user, meta, existing.familyId);
  }

  async logout(rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { loggedOut: true };
  }

  async updatePreferredLocale(userId: string, locale: 'en' | 'am') {
    await this.prisma.user.update({
      where: { id: userId },
      data: { preferredLocale: locale },
    });
    return { preferredLocale: locale };
  }

  private userWithRolesInclude() {
    return {
      roles: {
        include: {
          role: {
            include: {
              permissions: { include: { permission: true } },
            },
          },
        },
      },
    };
  }

  private async issueTokenPair(
    user: {
      id: string;
      email: string | null;
      phone: string | null;
      fullName: string;
      preferredLocale: string;
      roles: Array<{
        role: {
          code: string;
          permissions: Array<{ permission: { code: string } }>;
        };
      }>;
    },
    meta?: { ip?: string; userAgent?: string },
    existingFamilyId?: string,
  ) {
    const roles = user.roles.map((r) => r.role.code);
    const permissions = Array.from(
      new Set(user.roles.flatMap((r) => r.role.permissions.map((p) => p.permission.code))),
    );

    const accessSecret = process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret';
    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        phone: user.phone,
        roles,
        permissions,
      },
      accessSecret,
      { expiresIn: (process.env.JWT_ACCESS_TTL ?? '15m') as jwt.SignOptions['expiresIn'] },
    );

    const rawRefreshToken = crypto.randomBytes(48).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const familyId = existingFamilyId ?? crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        familyId,
        expiresAt,
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        preferredLocale: user.preferredLocale,
        roles,
        permissions,
      },
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
