import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async listCustomers(search?: string) {
    const profiles = await this.prisma.customerProfile.findMany({
      where: search
        ? {
            user: {
              OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
              ],
            },
          }
        : undefined,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            status: true,
            createdAt: true,
          },
        },
        addresses: {
          where: { deletedAt: null },
          include: { deliveryZone: { select: { name: true } } },
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            orderNumber: true,
            status: true,
            grandTotal: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return profiles.map((p) => {
      const totalSpent = p.orders
        .filter((o) => o.status !== 'CANCELLED')
        .reduce((sum, o) => sum + Number(o.grandTotal), 0);
      return {
        id: p.id,
        user: p.user,
        orderCount: p.orders.length,
        totalSpent,
        addresses: p.addresses,
        recentOrders: p.orders.map((o) => ({ ...o, grandTotal: Number(o.grandTotal) })),
      };
    });
  }
}
