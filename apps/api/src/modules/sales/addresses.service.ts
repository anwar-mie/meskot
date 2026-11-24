import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateAddressInput } from '@meskot/shared-schemas';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async listDeliveryZones() {
    const zones = await this.prisma.deliveryZone.findMany({
      where: { isActive: true },
      orderBy: { fee: 'asc' },
    });
    return zones.map((z) => ({
      ...z,
      fee: Number(z.fee),
      freeDeliveryThreshold: z.freeDeliveryThreshold ? Number(z.freeDeliveryThreshold) : null,
    }));
  }

  private async ensureCustomerProfile(userId: string) {
    let profile = await this.prisma.customerProfile.findUnique({ where: { userId } });
    if (!profile) {
      profile = await this.prisma.customerProfile.create({ data: { userId } });
    }
    return profile;
  }

  async listAddresses(userId: string) {
    const profile = await this.ensureCustomerProfile(userId);
    const addresses = await this.prisma.address.findMany({
      where: { customerProfileId: profile.id, deletedAt: null },
      include: { deliveryZone: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return addresses.map((a) => ({
      ...a,
      deliveryZone: a.deliveryZone
        ? {
            ...a.deliveryZone,
            fee: Number(a.deliveryZone.fee),
            freeDeliveryThreshold: a.deliveryZone.freeDeliveryThreshold
              ? Number(a.deliveryZone.freeDeliveryThreshold)
              : null,
          }
        : null,
    }));
  }

  async createAddress(userId: string, input: CreateAddressInput) {
    const profile = await this.ensureCustomerProfile(userId);
    const zone = await this.prisma.deliveryZone.findUnique({
      where: { id: input.deliveryZoneId },
    });
    if (!zone || !zone.isActive) {
      throw new NotFoundException('Delivery zone not found');
    }

    if (input.isDefault) {
      await this.prisma.address.updateMany({
        where: { customerProfileId: profile.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const created = await this.prisma.address.create({
      data: {
        customerProfileId: profile.id,
        deliveryZoneId: zone.id,
        label: input.label,
        recipientName: input.recipientName,
        recipientPhone: input.recipientPhone,
        city: input.city,
        subCity: input.subCity,
        woreda: input.woreda,
        streetAddress: input.streetAddress,
        landmark: input.landmark,
        isDefault: input.isDefault,
      },
      include: { deliveryZone: true },
    });

    return {
      ...created,
      deliveryZone: created.deliveryZone
        ? {
            ...created.deliveryZone,
            fee: Number(created.deliveryZone.fee),
            freeDeliveryThreshold: created.deliveryZone.freeDeliveryThreshold
              ? Number(created.deliveryZone.freeDeliveryThreshold)
              : null,
          }
        : null,
    };
  }

  async deleteAddress(userId: string, addressId: string) {
    const profile = await this.ensureCustomerProfile(userId);
    await this.prisma.address.updateMany({
      where: { id: addressId, customerProfileId: profile.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return { deleted: true };
  }
}
