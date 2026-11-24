import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DeliveryZonesService {
  constructor(private readonly prisma: PrismaService) {}

  async listZones() {
    const zones = await this.prisma.deliveryZone.findMany({
      orderBy: [{ isActive: 'desc' }, { fee: 'asc' }],
    });
    return zones.map((z) => ({
      ...z,
      fee: Number(z.fee),
      freeDeliveryThreshold: z.freeDeliveryThreshold ? Number(z.freeDeliveryThreshold) : null,
    }));
  }

  async createZone(
    body: {
      name: string;
      city?: string;
      fee: number;
      freeDeliveryThreshold?: number | null;
      estimatedDaysMin?: number;
      estimatedDaysMax?: number;
    },
    actorId: string,
  ) {
    const existing = await this.prisma.deliveryZone.findUnique({ where: { name: body.name } });
    if (existing) throw new ConflictException('A delivery zone with this name already exists');

    const zone = await this.prisma.deliveryZone.create({
      data: {
        name: body.name,
        city: body.city ?? 'Addis Ababa',
        fee: body.fee,
        freeDeliveryThreshold: body.freeDeliveryThreshold ?? null,
        estimatedDaysMin: body.estimatedDaysMin ?? 1,
        estimatedDaysMax: body.estimatedDaysMax ?? 2,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'DELIVERY_ZONE_CREATED',
        entityType: 'DeliveryZone',
        entityId: zone.id,
        afterData: { name: zone.name, fee: Number(zone.fee) },
      },
    });

    return {
      ...zone,
      fee: Number(zone.fee),
      freeDeliveryThreshold: zone.freeDeliveryThreshold ? Number(zone.freeDeliveryThreshold) : null,
    };
  }

  async updateZone(
    id: string,
    body: {
      name?: string;
      city?: string;
      fee?: number;
      freeDeliveryThreshold?: number | null;
      estimatedDaysMin?: number;
      estimatedDaysMax?: number;
      isActive?: boolean;
    },
    actorId: string,
  ) {
    const existing = await this.prisma.deliveryZone.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Delivery zone not found');

    const updated = await this.prisma.deliveryZone.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.city !== undefined ? { city: body.city } : {}),
        ...(body.fee !== undefined ? { fee: body.fee } : {}),
        ...(body.freeDeliveryThreshold !== undefined
          ? { freeDeliveryThreshold: body.freeDeliveryThreshold }
          : {}),
        ...(body.estimatedDaysMin !== undefined ? { estimatedDaysMin: body.estimatedDaysMin } : {}),
        ...(body.estimatedDaysMax !== undefined ? { estimatedDaysMax: body.estimatedDaysMax } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'DELIVERY_ZONE_UPDATED',
        entityType: 'DeliveryZone',
        entityId: id,
        beforeData: { fee: Number(existing.fee), isActive: existing.isActive },
        afterData: { fee: Number(updated.fee), isActive: updated.isActive },
      },
    });

    return {
      ...updated,
      fee: Number(updated.fee),
      freeDeliveryThreshold: updated.freeDeliveryThreshold
        ? Number(updated.freeDeliveryThreshold)
        : null,
    };
  }
}
