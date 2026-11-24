import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    const rows = await this.prisma.businessSetting.findMany({ orderBy: { key: 'asc' } });
    const map: Record<string, unknown> = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }
    return map;
  }

  async updateSettings(updates: Record<string, unknown>, actorId: string) {
    const entries = Object.entries(updates);
    await this.prisma.$transaction(async (tx) => {
      for (const [key, value] of entries) {
        await tx.businessSetting.upsert({
          where: { key },
          update: { value: value as any },
          create: { key, value: value as any },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'BUSINESS_SETTINGS_UPDATED',
          entityType: 'BusinessSetting',
          entityId: 'global',
          afterData: updates as any,
        },
      });
    });

    return this.getSettings();
  }
}
