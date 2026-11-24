import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DeliveryStatus, OrderStatus } from '@meskot/database';
import { canTransitionDelivery, type DeliveryStatusType } from '@meskot/shared-types';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DeliveriesService {
  constructor(private readonly prisma: PrismaService) {}

  async listAllDeliveries() {
    const [deliveries, agents] = await Promise.all([
      this.prisma.delivery.findMany({
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              grandTotal: true,
              paymentMethod: true,
              shippingAddress: true,
            },
          },
          deliveryZone: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.user.findMany({
        where: {
          deletedAt: null,
          status: 'ACTIVE',
          roles: { some: { role: { code: 'DELIVERY_AGENT' } } },
        },
        select: { id: true, fullName: true, phone: true },
      }),
    ]);

    return {
      deliveries: deliveries.map((d) => ({
        ...d,
        codAmountExpected: Number(d.codAmountExpected),
        codAmountCollected: Number(d.codAmountCollected),
        order: { ...d.order, grandTotal: Number(d.order.grandTotal) },
      })),
      agents,
    };
  }

  async listAssignedDeliveries(agentId: string) {
    const deliveries = await this.prisma.delivery.findMany({
      where: { assignedAgentId: agentId },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            grandTotal: true,
            paymentMethod: true,
            shippingAddress: true,
          },
        },
        attempts: { orderBy: { attemptNumber: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return deliveries.map((d) => ({
      ...d,
      codAmountExpected: Number(d.codAmountExpected),
      codAmountCollected: Number(d.codAmountCollected),
      order: { ...d.order, grandTotal: Number(d.order.grandTotal) },
    }));
  }

  async assignAgent(deliveryId: string, agentId: string, actorId: string) {
    const delivery = await this.prisma.delivery.findUnique({ where: { id: deliveryId } });
    if (!delivery) throw new NotFoundException('Delivery record not found');

    const agent = await this.prisma.user.findUnique({ where: { id: agentId } });
    if (!agent) throw new NotFoundException('Delivery agent not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.deliveryAssignment.updateMany({
        where: { deliveryId, unassignedAt: null },
        data: { unassignedAt: new Date() },
      });

      await tx.deliveryAssignment.create({
        data: { deliveryId, agentId, assignedById: actorId },
      });

      await tx.delivery.update({
        where: { id: deliveryId },
        data: {
          assignedAgentId: agentId,
          status:
            delivery.status === DeliveryStatus.UNASSIGNED
              ? DeliveryStatus.ASSIGNED
              : delivery.status,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'DELIVERY_AGENT_ASSIGNED',
          entityType: 'Delivery',
          entityId: deliveryId,
          afterData: { agentId, agentName: agent.fullName },
        },
      });
    });

    return { deliveryId, assignedAgentId: agentId };
  }

  async updateDeliveryStatus(
    deliveryId: string,
    body: {
      status: DeliveryStatusType;
      note?: string;
      recipientSignedName?: string;
      codAmountCollected?: number;
    },
    actor: { sub: string; roles: string[] },
  ) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { attempts: true },
    });
    if (!delivery) throw new NotFoundException('Delivery not found');

    const isManager = actor.roles.some((r) =>
      ['SUPER_ADMIN', 'ADMIN', 'DELIVERY_MANAGER'].includes(r),
    );
    // DEL-04: Delivery agent can ONLY update their own assigned delivery
    if (!isManager && delivery.assignedAgentId !== actor.sub) {
      throw new ForbiddenException('You are not assigned to this delivery');
    }

    if (!canTransitionDelivery(delivery.status as DeliveryStatusType, body.status)) {
      throw new ConflictException(
        `Invalid delivery status transition from ${delivery.status} to ${body.status}`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.delivery.update({
        where: { id: deliveryId },
        data: {
          status: body.status as DeliveryStatus,
          ...(body.recipientSignedName ? { recipientSignedName: body.recipientSignedName } : {}),
          ...(typeof body.codAmountCollected === 'number'
            ? { codAmountCollected: body.codAmountCollected }
            : {}),
          ...(body.status === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
        },
      });

      await tx.deliveryAttempt.create({
        data: {
          deliveryId,
          attemptNumber: delivery.attempts.length + 1,
          status: body.status as DeliveryStatus,
          note: body.note,
        },
      });

      if (body.status === 'OUT_FOR_DELIVERY') {
        await tx.order.update({
          where: { id: delivery.orderId },
          data: { status: OrderStatus.OUT_FOR_DELIVERY },
        });
      } else if (body.status === 'DELIVERED') {
        await tx.order.update({
          where: { id: delivery.orderId },
          data: { status: OrderStatus.DELIVERED, deliveredAt: new Date() },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: actor.sub,
          action: 'DELIVERY_STATUS_UPDATED',
          entityType: 'Delivery',
          entityId: deliveryId,
          beforeData: { status: delivery.status },
          afterData: { status: body.status, note: body.note },
        },
      });
    });

    return { id: deliveryId, status: body.status };
  }
}
