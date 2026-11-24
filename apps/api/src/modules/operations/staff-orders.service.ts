import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  OrderStatus,
  PaymentStatus,
  StockMovementType,
  StockReservationStatus,
} from '@meskot/database';
import {
  canTransitionOrder,
  canTransitionPayment,
  type OrderStatusType,
  type PaymentStatusType,
} from '@meskot/shared-types';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StaffOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async listOrders(params: { search?: string; status?: string; paymentStatus?: string }) {
    const orders = await this.prisma.order.findMany({
      where: {
        ...(params.status && params.status !== 'ALL'
          ? { status: params.status as OrderStatus }
          : {}),
        ...(params.paymentStatus && params.paymentStatus !== 'ALL'
          ? { payments: { some: { status: params.paymentStatus as PaymentStatus } } }
          : {}),
        ...(params.search
          ? {
              OR: [
                { orderNumber: { contains: params.search, mode: 'insensitive' } },
                {
                  customerProfile: {
                    user: {
                      OR: [
                        { fullName: { contains: params.search, mode: 'insensitive' } },
                        { phone: { contains: params.search, mode: 'insensitive' } },
                      ],
                    },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        customerProfile: {
          include: { user: { select: { id: true, fullName: true, email: true, phone: true } } },
        },
        items: true,
        shippingAddress: true,
        payments: true,
        delivery: {
          include: {
            assignments: {
              where: { unassignedAt: null },
              include: { agent: { select: { id: true, fullName: true, phone: true } } },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      paymentMethod: o.paymentMethod,
      subtotal: Number(o.subtotal),
      deliveryFee: Number(o.deliveryFee),
      grandTotal: Number(o.grandTotal),
      createdAt: o.createdAt,
      customer: o.customerProfile.user,
      shippingAddress: o.shippingAddress,
      payment: o.payments[0]
        ? {
            id: o.payments[0].id,
            status: o.payments[0].status,
            amount: Number(o.payments[0].amount),
          }
        : null,
      delivery: o.delivery
        ? {
            id: o.delivery.id,
            status: o.delivery.status,
            trackingCode: o.delivery.trackingCode,
            assignedAgent: o.delivery.assignments[0]?.agent ?? null,
          }
        : null,
      items: o.items.map((i) => ({
        id: i.id,
        productNameSnapshot: i.productNameSnapshot,
        variantNameSnapshot: i.variantNameSnapshot,
        skuSnapshot: i.skuSnapshot,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        lineTotal: Number(i.lineTotal),
      })),
    }));
  }

  async updateOrderStatus(orderId: string, nextStatus: OrderStatusType, actorId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { stockReservations: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (!canTransitionOrder(order.status as OrderStatusType, nextStatus)) {
      throw new ConflictException(
        `Invalid order status transition from ${order.status} to ${nextStatus}`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: nextStatus as OrderStatus,
          ...(nextStatus === 'CONFIRMED' ? { confirmedAt: new Date() } : {}),
          ...(nextStatus === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
          ...(nextStatus === 'COMPLETED' ? { completedAt: new Date() } : {}),
          ...(nextStatus === 'CANCELLED' ? { cancelledAt: new Date() } : {}),
        },
      });

      const activeReservations = order.stockReservations.filter(
        (r) => r.status === StockReservationStatus.ACTIVE,
      );

      if (nextStatus === 'CANCELLED') {
        for (const res of activeReservations) {
          await tx.stockReservation.update({
            where: { id: res.id },
            data: { status: StockReservationStatus.RELEASED, releasedAt: new Date() },
          });
          await tx.inventoryItem.update({
            where: {
              warehouseId_variantId: {
                warehouseId: res.warehouseId,
                variantId: res.variantId,
              },
            },
            data: { reserved: { decrement: res.quantity } },
          });
        }
      } else if (nextStatus === 'DELIVERED') {
        // Commit remaining COD reservations on delivery
        for (const res of activeReservations) {
          await tx.stockReservation.update({
            where: { id: res.id },
            data: { status: StockReservationStatus.COMMITTED },
          });
          await tx.inventoryItem.update({
            where: {
              warehouseId_variantId: {
                warehouseId: res.warehouseId,
                variantId: res.variantId,
              },
            },
            data: {
              onHand: { decrement: res.quantity },
              reserved: { decrement: res.quantity },
            },
          });
          await tx.stockMovement.create({
            data: {
              warehouseId: res.warehouseId,
              variantId: res.variantId,
              type: StockMovementType.ORDER_COMMIT,
              quantityDelta: -res.quantity,
              reason: `Delivered COD order ${order.orderNumber}`,
              referenceType: 'ORDER',
              referenceId: order.id,
              actorId,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'ORDER_STATUS_UPDATED',
          entityType: 'Order',
          entityId: orderId,
          beforeData: { status: order.status },
          afterData: { status: nextStatus },
        },
      });
    });

    return { id: orderId, status: nextStatus };
  }

  async reconcileCodPayment(paymentId: string, nextStatus: PaymentStatusType, actorId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');

    if (!canTransitionPayment(payment.status as PaymentStatusType, nextStatus)) {
      throw new ConflictException(
        `Invalid payment status transition from ${payment.status} to ${nextStatus}`,
      );
    }

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: nextStatus as PaymentStatus,
        ...(nextStatus === 'COD_COLLECTED' ? { codCollectedAt: new Date() } : {}),
        ...(nextStatus === 'COD_RECONCILED' ? { codReconciledAt: new Date(), paidAt: new Date() } : {}),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'PAYMENT_STATUS_UPDATED',
        entityType: 'Payment',
        entityId: paymentId,
        beforeData: { status: payment.status },
        afterData: { status: nextStatus },
      },
    });

    return { id: updated.id, status: updated.status };
  }
}
