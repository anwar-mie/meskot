import { describe, expect, test } from 'bun:test';
import { normalizeEthiopianPhone, registerSchema, stockAdjustmentSchema } from './index';

describe('Shared validation schemas', () => {
  test('normalizes Ethiopian local numbers (09 / 07) to +251 format', () => {
    expect(normalizeEthiopianPhone('0911 234 567')).toBe('+251911234567');
    expect(normalizeEthiopianPhone('0712-345-678')).toBe('+251712345678');
    expect(normalizeEthiopianPhone('+251911000001')).toBe('+251911000001');
  });

  test('registerSchema accepts valid Ethiopian phone or email and rejects weak passwords', () => {
    const valid = registerSchema.safeParse({
      fullName: 'Selam Abebe',
      phone: '0911234567',
      password: 'Password123',
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.phone).toBe('+251911234567');
    }

    const weak = registerSchema.safeParse({
      fullName: 'Selam',
      email: 'selam@example.com',
      password: 'short',
    });
    expect(weak.success).toBe(false);
  });

  test('stockAdjustmentSchema requires positive quantity and reason', () => {
    expect(
      stockAdjustmentSchema.safeParse({
        warehouseId: 'wh-1',
        variantId: 'var-1',
        direction: 'REMOVE',
        quantity: 2,
        reason: 'Damaged during handling',
      }).success,
    ).toBe(true);

    expect(
      stockAdjustmentSchema.safeParse({
        warehouseId: 'wh-1',
        variantId: 'var-1',
        direction: 'REMOVE',
        quantity: 0,
        reason: 'Damaged',
      }).success,
    ).toBe(false);
  });
});
