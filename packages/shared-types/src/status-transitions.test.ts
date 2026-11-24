import { describe, expect, test } from 'bun:test';
import {
  canTransitionDelivery,
  canTransitionOrder,
  canTransitionPayment,
  canTransitionRefund,
  formatEtb,
} from './index';

describe('Status transition tables (SRS Section 6)', () => {
  test('Order transitions enforce valid flow and block terminal/invalid jumps', () => {
    expect(canTransitionOrder('PENDING_PAYMENT', 'CONFIRMED')).toBe(true);
    expect(canTransitionOrder('CONFIRMED', 'PROCESSING')).toBe(true);
    expect(canTransitionOrder('CONFIRMED', 'DELIVERED')).toBe(false);
    expect(canTransitionOrder('CANCELLED', 'CONFIRMED')).toBe(false);
    expect(canTransitionOrder('COMPLETED', 'CANCELLED')).toBe(false);
  });

  test('Payment transitions separate online and COD flows', () => {
    expect(canTransitionPayment('PENDING', 'PAID')).toBe(true);
    expect(canTransitionPayment('COD_PENDING', 'COD_COLLECTED')).toBe(true);
    expect(canTransitionPayment('COD_COLLECTED', 'COD_RECONCILED')).toBe(true);
    expect(canTransitionPayment('FAILED', 'PAID')).toBe(false);
  });

  test('Delivery and Refund transitions enforce valid states', () => {
    expect(canTransitionDelivery('UNASSIGNED', 'ASSIGNED')).toBe(true);
    expect(canTransitionDelivery('UNASSIGNED', 'DELIVERED')).toBe(false);
    expect(canTransitionDelivery('OUT_FOR_DELIVERY', 'FAILED_ATTEMPT')).toBe(true);
    expect(canTransitionRefund('REQUESTED', 'APPROVED')).toBe(true);
    expect(canTransitionRefund('REJECTED', 'COMPLETED')).toBe(false);
  });

  test('formatEtb formats Ethiopian Birr cleanly', () => {
    expect(formatEtb(1250)).toBe('ETB 1,250.00');
    expect(formatEtb('84250.5')).toBe('ETB 84,250.50');
  });
});
