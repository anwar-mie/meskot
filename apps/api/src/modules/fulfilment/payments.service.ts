import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import {
  OrderStatus,
  PaymentStatus,
  PaymentTransactionStatus,
  StockMovementType,
  StockReservationStatus,
} from '@meskot/database';
import type { InitializePaymentInput } from '@meskot/shared-schemas';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async initializePayment(userId: string, input: InitializePaymentInput) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: input.orderId,
        customerProfile: { userId },
      },
      include: {
        payments: true,
        customerProfile: { include: { user: true } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentMethod === 'COD') {
      throw new BadRequestException('Cash on delivery orders do not require online initialization');
    }

    const payment = order.payments[0];
    if (!payment) throw new NotFoundException('Payment record not found');
    if (payment.status === PaymentStatus.PAID) {
      return {
        alreadyPaid: true,
        orderNumber: order.orderNumber,
        checkoutUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/orders/${order.orderNumber}/confirmation`,
      };
    }

    const txRef = `MKT-${order.orderNumber}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const returnUrl =
      input.returnUrl ?? `${appUrl}/orders/${order.orderNumber}/confirmation`;

    const useLiveChapa =
      order.paymentMethod === 'CHAPA' &&
      Boolean(process.env.CHAPA_SECRET_KEY) &&
      !process.env.CHAPA_SECRET_KEY!.includes('replace-me');

    let checkoutUrl = `${appUrl}/checkout/mock-pay?ref=${encodeURIComponent(txRef)}&orderNumber=${encodeURIComponent(order.orderNumber)}&amount=${Number(payment.amount)}`;
    let provider = 'MOCK_ONLINE';
    let rawResponse: Record<string, unknown> = { mode: 'mock_online', tx_ref: txRef };

    if (useLiveChapa) {
      provider = 'CHAPA';
      const baseUrl = process.env.CHAPA_BASE_URL ?? 'https://api.chapa.co/v1';
      const user = order.customerProfile.user;
      const [firstName, ...restNames] = (user.fullName || 'Customer').split(' ');
      const payload = {
        amount: String(Number(payment.amount)),
        currency: 'ETB',
        email: user.email ?? 'customer@market.et',
        first_name: firstName,
        last_name: restNames.join(' ') || 'Customer',
        phone_number: user.phone ?? undefined,
        tx_ref: txRef,
        return_url: returnUrl,
        customization: {
          title: 'market. Order',
          description: `Payment for order ${order.orderNumber}`,
        },
      };

      const resp = await fetch(`${baseUrl}/transaction/initialize`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const json = (await resp.json()) as {
        status?: string;
        message?: string;
        data?: { checkout_url?: string };
      };
      if (!resp.ok || !json.data?.checkout_url) {
        throw new BadRequestException(json.message ?? 'Chapa initialization failed');
      }
      checkoutUrl = json.data.checkout_url;
      rawResponse = json as unknown as Record<string, unknown>;
    }

    const tx = await this.prisma.paymentTransaction.create({
      data: {
        paymentId: payment.id,
        provider,
        providerReference: txRef,
        status: PaymentTransactionStatus.INITIALIZED,
        amount: payment.amount,
        checkoutUrl,
        rawResponse: rawResponse as any,
      },
    });

    return {
      transactionId: tx.id,
      provider,
      providerReference: tx.providerReference,
      checkoutUrl,
      orderNumber: order.orderNumber,
      amount: Number(tx.amount),
    };
  }

  async handleWebhook(
    providerParam: string,
    body: Record<string, unknown>,
    signatureHeader?: string,
  ) {
    const provider = providerParam.toUpperCase();

    if (provider === 'CHAPA') {
      const secret = process.env.CHAPA_WEBHOOK_SECRET;
      if (secret && !secret.includes('replace-me')) {
        const expected = crypto
          .createHmac('sha256', secret)
          .update(JSON.stringify(body))
          .digest('hex');
        if (!signatureHeader || signatureHeader !== expected) {
          throw new ForbiddenException('Invalid Chapa webhook signature');
        }
      }
    } else if (provider === 'MOCK_ONLINE') {
      if (process.env.NODE_ENV === 'production') {
        throw new ForbiddenException('Mock payment webhook disabled in production');
      }
    } else {
      throw new BadRequestException(`Unsupported payment provider: ${providerParam}`);
    }

    const txRef = String(body.tx_ref ?? body.providerReference ?? '');
    const statusRaw = String(body.status ?? 'success').toLowerCase();
    const eventId = body.event_id ? String(body.event_id) : `${provider}:${txRef}:${statusRaw}`;

    if (!txRef) {
      throw new BadRequestException('Missing tx_ref / providerReference');
    }

    // PAY-02: Replay protection
    const alreadyHandledEvent = await this.prisma.paymentTransaction.findFirst({
      where: { webhookEventId: eventId },
    });
    if (alreadyHandledEvent) {
      return { ok: true, idempotent: true };
    }

    const txRecord = await this.prisma.paymentTransaction.findUnique({
      where: { providerReference: txRef },
      include: {
        payment: {
          include: {
            order: { include: { stockReservations: true } },
          },
        },
      },
    });

    if (!txRecord) {
      throw new NotFoundException('Payment transaction not found');
    }

    if (txRecord.status === PaymentTransactionStatus.SUCCEEDED) {
      return { ok: true, idempotent: true };
    }

    const isSuccess = statusRaw === 'success' || statusRaw === 'succeeded' || statusRaw === 'paid';

    if (!isSuccess) {
      await this.prisma.$transaction([
        this.prisma.paymentTransaction.update({
          where: { id: txRecord.id },
          data: {
            status: PaymentTransactionStatus.FAILED,
            webhookEventId: eventId,
            rawResponse: body as any,
          },
        }),
        this.prisma.payment.update({
          where: { id: txRecord.paymentId },
          data: { status: PaymentStatus.FAILED },
        }),
      ]);
      return { ok: true, status: 'FAILED' };
    }

    // Atomic payment confirmation + stock reservation commit
    await this.prisma.$transaction(async (tx) => {
      await tx.paymentTransaction.update({
        where: { id: txRecord.id },
        data: {
          status: PaymentTransactionStatus.SUCCEEDED,
          webhookEventId: eventId,
          verifiedAt: new Date(),
          rawResponse: body as any,
        },
      });

      await tx.payment.update({
        where: { id: txRecord.paymentId },
        data: { status: PaymentStatus.PAID, paidAt: new Date() },
      });

      const order = txRecord.payment.order;
      if (order.status === OrderStatus.PENDING_PAYMENT) {
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.CONFIRMED, confirmedAt: new Date() },
        });
      }

      const activeReservations = order.stockReservations.filter(
        (r) => r.status === StockReservationStatus.ACTIVE,
      );
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
            reason: `Committed for paid order ${order.orderNumber}`,
            referenceType: 'ORDER',
            referenceId: order.id,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          action: 'PAYMENT_VERIFIED',
          entityType: 'Order',
          entityId: order.id,
          afterData: { provider, txRef, amount: Number(txRecord.amount) },
        },
      });
    });

    return { ok: true, status: 'PAID', orderNumber: txRecord.payment.order.orderNumber };
  }
}
