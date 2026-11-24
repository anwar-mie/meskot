import { describe, expect, mock, test } from 'bun:test';
import { ForbiddenException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PaymentsService } from '../fulfilment/payments.service';
import { DeliveriesService } from '../operations/deliveries.service';

describe('SRS Section 12 Acceptance Criteria', () => {
  test('ORD-06: submitting same order request twice with same idempotency key returns original order without duplicating', async () => {
    const existingOrder = {
      id: 'ord-1',
      orderNumber: 'MK-20261124-ABCD',
      idempotencyKey: 'idem-key-12345678',
      customerProfileId: 'prof-1',
      status: 'CONFIRMED',
      subtotal: 1250,
      discountTotal: 0,
      deliveryFee: 150,
      taxTotal: 0,
      grandTotal: 1400,
      items: [{ id: 'oi-1', unitPrice: 1250, discountAmount: 0, lineTotal: 1250 }],
      payments: [{ id: 'pay-1', amount: 1400, status: 'COD_PENDING' }],
    };

    const txSpy = mock(() => {
      throw new Error('Transaction should NOT execute for duplicate idempotency key');
    });

    const prismaMock = {
      customerProfile: {
        findUnique: mock(async () => ({ id: 'prof-1', userId: 'user-1' })),
      },
      order: {
        findUnique: mock(async () => existingOrder),
      },
      $transaction: txSpy,
    } as any;

    const service = new OrdersService(prismaMock);
    const result = await service.createOrder(
      'user-1',
      { addressId: 'addr-1', paymentMethod: 'COD' },
      'idem-key-12345678',
    );

    expect(result.orderNumber).toBe('MK-20261124-ABCD');
    expect(txSpy).not.toHaveBeenCalled();
  });

  test('PAY-02: replayed payment webhook returns idempotent ok without reprocessing', async () => {
    const txSpy = mock(() => {
      throw new Error('Transaction should NOT execute on replayed webhook');
    });

    const prismaMock = {
      paymentTransaction: {
        findFirst: mock(async () => ({ id: 'ptx-1', webhookEventId: 'MOCK_ONLINE:ref-1:success' })),
      },
      $transaction: txSpy,
    } as any;

    const service = new PaymentsService(prismaMock);
    const result = await service.handleWebhook('mock_online', {
      tx_ref: 'ref-1',
      status: 'success',
    });

    expect(result).toEqual({ ok: true, idempotent: true });
    expect(txSpy).not.toHaveBeenCalled();
  });

  test('DEL-04: delivery agent attempting to update another agent delivery receives 403 Forbidden', async () => {
    const prismaMock = {
      delivery: {
        findUnique: mock(async () => ({
          id: 'del-1',
          assignedAgentId: 'agent-A',
          status: 'ASSIGNED',
          attempts: [],
        })),
      },
    } as any;

    const service = new DeliveriesService(prismaMock);

    await expect(
      service.updateDeliveryStatus(
        'del-1',
        { status: 'PICKED_UP' },
        { sub: 'agent-B', roles: ['DELIVERY_AGENT'] },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
