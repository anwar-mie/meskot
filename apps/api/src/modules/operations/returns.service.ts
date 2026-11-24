import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  RefundStatus,
  RestockDecision,
  ReturnStatus,
  StockMovementType,
} from '@meskot/database';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReturnsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReturnRequest(
    userId: string,
    body: {
      orderNumber: string;
      reason: string;
      customerNote?: string;
      items: Array<{ orderItemId: string; quantity: number }>;
    },
  ) {
    const order = await this.prisma.order.findFirst({
      where: { orderNumber: body.orderNumber, customerProfile: { userId } },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (!body.items || body.items.length === 0) {
      throw new BadRequestException('Select at least one item to return');
    }

    const request = await this.prisma.returnRequest.create({
      data: {
        orderId: order.id,
        reason: body.reason,
        customerNote: body.customerNote,
        items: {
          create: body.items.map((item) => ({
            orderItemId: item.orderItemId,
            quantity: item.quantity,
            restockDecision: RestockDecision.PENDING,
          })),
        },
      },
      include: { items: true },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'RETURN_REQUESTED',
        entityType: 'ReturnRequest',
        entityId: request.id,
        afterData: { orderNumber: order.orderNumber, reason: body.reason },
      },
    });

    return request;
  }

  async listStaffReturns() {
    return this.prisma.returnRequest.findMany({
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            grandTotal: true,
            customerProfile: { include: { user: { select: { fullName: true, phone: true } } } },
          },
        },
        items: { include: { orderItem: true } },
        refunds: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async reviewReturn(
    returnId: string,
    body: {
      status: 'APPROVED' | 'REJECTED' | 'COMPLETED';
      restockDecision?: 'RESTOCKED' | 'DAMAGED_DISCARD';
      refundAmount?: number;
      staffNote?: string;
    },
    actorId: string,
  ) {
    const reqRecord = await this.prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: {
        order: { include: { payments: true } },
        items: { include: { orderItem: true } },
      },
    });
    if (!reqRecord) throw new NotFoundException('Return request not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.returnRequest.update({
        where: { id: returnId },
        data: {
          status: body.status as ReturnStatus,
          staffNote: body.staffNote,
          reviewedAt: new Date(),
        },
      });

      // RET-02: Separate restocking decision & refund recording
      if (body.restockDecision) {
        const defaultWarehouse = await tx.warehouse.findFirst({ where: { isDefault: true } });
        for (const item of reqRecord.items) {
          await tx.returnItem.update({
            where: { id: item.id },
            data: {
              restockDecision: body.restockDecision as RestockDecision,
              restockedAt: body.restockDecision === 'RESTOCKED' ? new Date() : null,
            },
          });

          if (
            body.restockDecision === 'RESTOCKED' &&
            defaultWarehouse &&
            item.orderItem.variantId
          ) {
            await tx.inventoryItem.upsert({
              where: {
                warehouseId_variantId: {
                  warehouseId: defaultWarehouse.id,
                  variantId: item.orderItem.variantId,
                },
              },
              update: { onHand: { increment: item.quantity } },
              create: {
                warehouseId: defaultWarehouse.id,
                variantId: item.orderItem.variantId,
                onHand: item.quantity,
                reserved: 0,
              },
            });
            await tx.stockMovement.create({
              data: {
                warehouseId: defaultWarehouse.id,
                variantId: item.orderItem.variantId,
                type: StockMovementType.RETURN_RESTOCK,
                quantityDelta: item.quantity,
                reason: `Restocked from return ${returnId}`,
                referenceType: 'RETURN',
                referenceId: returnId,
                actorId,
              },
            });
          }
        }
      }

      if (body.status === 'APPROVED' && body.refundAmount && reqRecord.order.payments[0]) {
        await tx.refund.create({
          data: {
            paymentId: reqRecord.order.payments[0].id,
            returnRequestId: returnId,
            status: RefundStatus.APPROVED,
            amount: body.refundAmount,
            reason: reqRecord.reason,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'RETURN_REVIEWED',
          entityType: 'ReturnRequest',
          entityId: returnId,
          afterData: body,
        },
      });
    });

    return { id: returnId, status: body.status };
  }
}
