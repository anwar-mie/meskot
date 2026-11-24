import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import {
  DeliveryStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  StockReservationStatus,
} from '@meskot/database';
import type { CreateOrderInput } from '@meskot/shared-schemas';
import { PrismaService } from '../../prisma/prisma.service';

const CUSTOMER_CANCELLABLE_STATUSES = new Set<OrderStatus>([
  OrderStatus.PENDING_PAYMENT,
  OrderStatus.CONFIRMED,
  OrderStatus.PROCESSING,
]);

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureCustomerProfile(userId: string) {
    let profile = await this.prisma.customerProfile.findUnique({ where: { userId } });
    if (!profile) {
      profile = await this.prisma.customerProfile.create({ data: { userId } });
    }
    return profile;
  }

  async createOrder(userId: string, input: CreateOrderInput, idempotencyKey: string) {
    if (!idempotencyKey || idempotencyKey.trim().length < 8) {
      throw new BadRequestException('Idempotency-Key header (min 8 chars) is required');
    }

    const profile = await this.ensureCustomerProfile(userId);

    // ORD-06: Idempotency check before creating anything
    const existingByKey = await this.prisma.order.findUnique({
      where: { idempotencyKey },
      include: this.orderDetailInclude(),
    });
    if (existingByKey) {
      if (existingByKey.customerProfileId !== profile.id) {
        throw new ConflictException('Idempotency key belongs to another account');
      }
      return this.serializeOrder(existingByKey);
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findFirst({
        where: { customerProfileId: profile.id },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
                  },
                },
              },
            },
          },
        },
      });

      if (!cart || cart.items.length === 0) {
        throw new BadRequestException('Your shopping cart is empty');
      }

      const address = await tx.address.findFirst({
        where: { id: input.addressId, customerProfileId: profile.id, deletedAt: null },
        include: { deliveryZone: true },
      });
      if (!address) {
        throw new NotFoundException('Selected delivery address not found');
      }

      // INV-05: Lock InventoryItem rows in deterministic order using FOR UPDATE to prevent overselling
      const variantIds = Array.from(new Set(cart.items.map((i) => i.variantId))).sort();
      const reservationPlans: Array<{
        inventoryItemId: string;
        warehouseId: string;
        variantId: string;
        quantity: number;
      }> = [];

      for (const variantId of variantIds) {
        const requestedQty = cart.items
          .filter((i) => i.variantId === variantId)
          .reduce((sum, i) => sum + i.quantity, 0);

        const lockedRows = await tx.$queryRaw<
          Array<{ id: string; warehouseId: string; onHand: number; reserved: number }>
        >`
          SELECT id, "warehouseId", "onHand", "reserved"
          FROM "InventoryItem"
          WHERE "variantId" = ${variantId}
          ORDER BY id ASC
          FOR UPDATE
        `;

        let remaining = requestedQty;
        for (const row of lockedRows) {
          const avail = Math.max(0, row.onHand - row.reserved);
          if (avail <= 0) continue;
          const take = Math.min(avail, remaining);
          reservationPlans.push({
            inventoryItemId: row.id,
            warehouseId: row.warehouseId,
            variantId,
            quantity: take,
          });
          remaining -= take;
          if (remaining === 0) break;
        }

        if (remaining > 0) {
          const item = cart.items.find((i) => i.variantId === variantId);
          throw new ConflictException(
            `Insufficient stock for ${item?.variant.product.nameEn ?? 'item'} (${item?.variant.sku ?? variantId}).`,
          );
        }
      }

      // CART-04 & CART-05: Server-side pricing, coupon discount, and delivery fee calculation
      const itemSnapshots = cart.items.map((item) => {
        const unitPrice = Number(item.variant.price);
        return {
          variantId: item.variantId,
          productNameSnapshot: item.variant.product.nameEn,
          variantNameSnapshot: item.variant.nameEn,
          skuSnapshot: item.variant.sku,
          imageUrlSnapshot: item.variant.product.images[0]?.url ?? null,
          quantity: item.quantity,
          unitPrice,
          lineTotal: unitPrice * item.quantity,
        };
      });

      const subtotal = itemSnapshots.reduce((sum, i) => sum + i.lineTotal, 0);

      let discountTotal = 0;
      let couponId: string | null = null;
      let couponCodeSnapshot: string | null = null;

      if (input.couponCode) {
        const coupon = await tx.coupon.findFirst({
          where: { code: input.couponCode.toUpperCase(), isActive: true },
        });
        if (coupon) {
          const now = new Date();
          const withinWindow =
            (!coupon.startsAt || coupon.startsAt <= now) &&
            (!coupon.endsAt || coupon.endsAt >= now);
          const underLimit = !coupon.usageLimit || coupon.usedCount < coupon.usageLimit;
          const meetsMin = !coupon.minOrderAmount || subtotal >= Number(coupon.minOrderAmount);
          if (withinWindow && underLimit && meetsMin) {
            couponId = coupon.id;
            couponCodeSnapshot = coupon.code;
            discountTotal =
              coupon.discountType === 'PERCENTAGE'
                ? (subtotal * Number(coupon.discountValue)) / 100
                : Number(coupon.discountValue);
            if (coupon.maxDiscount) {
              discountTotal = Math.min(discountTotal, Number(coupon.maxDiscount));
            }
            discountTotal = Math.min(discountTotal, subtotal);
            await tx.coupon.update({
              where: { id: coupon.id },
              data: { usedCount: { increment: 1 } },
            });
          }
        }
      }

      let deliveryFee = address.deliveryZone ? Number(address.deliveryZone.fee) : 150;
      if (
        address.deliveryZone?.freeDeliveryThreshold &&
        subtotal - discountTotal >= Number(address.deliveryZone.freeDeliveryThreshold)
      ) {
        deliveryFee = 0;
      }

      const grandTotal = Math.max(0, subtotal - discountTotal + deliveryFee);
      const isCod = input.paymentMethod === 'COD';
      const orderNumber = `MK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto
        .randomBytes(2)
        .toString('hex')
        .toUpperCase()}`;
      const trackingCode = `TRK-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          idempotencyKey,
          customerProfileId: profile.id,
          status: isCod ? OrderStatus.CONFIRMED : OrderStatus.PENDING_PAYMENT,
          paymentMethod: input.paymentMethod as PaymentMethod,
          subtotal,
          discountTotal,
          deliveryFee,
          grandTotal,
          couponId,
          couponCodeSnapshot,
          customerNote: input.customerNote,
          confirmedAt: isCod ? new Date() : null,
          items: {
            create: itemSnapshots,
          },
          shippingAddress: {
            create: {
              deliveryZoneId: address.deliveryZoneId,
              zoneName: address.deliveryZone?.name ?? null,
              recipientName: address.recipientName,
              recipientPhone: address.recipientPhone,
              city: address.city,
              subCity: address.subCity,
              woreda: address.woreda,
              streetAddress: address.streetAddress,
              landmark: address.landmark,
            },
          },
          payments: {
            create: {
              method: input.paymentMethod as PaymentMethod,
              status: isCod ? PaymentStatus.COD_PENDING : PaymentStatus.PENDING,
              amount: grandTotal,
            },
          },
          delivery: {
            create: {
              deliveryZoneId: address.deliveryZoneId,
              status: DeliveryStatus.UNASSIGNED,
              trackingCode,
              codAmountExpected: isCod ? grandTotal : 0,
            },
          },
        },
        include: this.orderDetailInclude(),
      });

      const reservationExpiresAt = isCod ? null : new Date(Date.now() + 15 * 60 * 1000);
      for (const plan of reservationPlans) {
        await tx.inventoryItem.update({
          where: { id: plan.inventoryItemId },
          data: { reserved: { increment: plan.quantity } },
        });
        await tx.stockReservation.create({
          data: {
            warehouseId: plan.warehouseId,
            variantId: plan.variantId,
            orderId: createdOrder.id,
            quantity: plan.quantity,
            status: StockReservationStatus.ACTIVE,
            expiresAt: reservationExpiresAt,
          },
        });
      }

      // Clear customer cart after successful order placement
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'ORDER_CREATED',
          entityType: 'Order',
          entityId: createdOrder.id,
          afterData: {
            orderNumber: createdOrder.orderNumber,
            paymentMethod: createdOrder.paymentMethod,
            grandTotal,
          },
        },
      });

      return createdOrder;
    });

    return this.serializeOrder(order);
  }

  async listCustomerOrders(userId: string) {
    const profile = await this.ensureCustomerProfile(userId);
    const orders = await this.prisma.order.findMany({
      where: { customerProfileId: profile.id },
      include: this.orderDetailInclude(),
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => this.serializeOrder(o));
  }

  async getCustomerOrder(userId: string, orderNumber: string) {
    const profile = await this.ensureCustomerProfile(userId);
    const order = await this.prisma.order.findFirst({
      where: { orderNumber, customerProfileId: profile.id },
      include: this.orderDetailInclude(),
    });
    if (!order) throw new NotFoundException('Order not found');
    return this.serializeOrder(order);
  }

  async cancelCustomerOrder(userId: string, orderNumber: string, reason?: string) {
    const profile = await this.ensureCustomerProfile(userId);
    const order = await this.prisma.order.findFirst({
      where: { orderNumber, customerProfileId: profile.id },
      include: { stockReservations: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (!CUSTOMER_CANCELLABLE_STATUSES.has(order.status)) {
      throw new ConflictException(
        'Order can no longer be cancelled directly once ready for or out for delivery.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: reason ?? 'Cancelled by customer',
        },
      });

      const activeReservations = order.stockReservations.filter(
        (r) => r.status === StockReservationStatus.ACTIVE,
      );
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

      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'ORDER_CANCELLED',
          entityType: 'Order',
          entityId: order.id,
          afterData: { reason: reason ?? 'Cancelled by customer' },
        },
      });
    });

    return this.getCustomerOrder(userId, orderNumber);
  }

  private orderDetailInclude() {
    return {
      items: true,
      shippingAddress: true,
      payments: { include: { transactions: { orderBy: { createdAt: 'desc' as const } } } },
      delivery: { include: { attempts: { orderBy: { attemptNumber: 'asc' as const } } } },
    };
  }

  private serializeOrder(order: any) {
    return {
      ...order,
      subtotal: Number(order.subtotal),
      discountTotal: Number(order.discountTotal),
      deliveryFee: Number(order.deliveryFee),
      taxTotal: Number(order.taxTotal),
      grandTotal: Number(order.grandTotal),
      items: order.items.map((item: any) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        discountAmount: Number(item.discountAmount),
        lineTotal: Number(item.lineTotal),
      })),
      payments: order.payments.map((p: any) => ({
        ...p,
        amount: Number(p.amount),
      })),
    };
  }
}
