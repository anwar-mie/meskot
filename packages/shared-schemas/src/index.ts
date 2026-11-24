import { z } from 'zod';

export function normalizeEthiopianPhone(raw: string): string {
  const compact = raw.replace(/[\s\-()]/g, '');
  if (/^0[79]\d{8}$/.test(compact)) {
    return `+251${compact.slice(1)}`;
  }
  if (/^251[79]\d{8}$/.test(compact)) {
    return `+${compact}`;
  }
  return compact;
}

const ethiopianPhoneSchema = z
  .string()
  .trim()
  .transform(normalizeEthiopianPhone)
  .refine((val) => /^\+251[79]\d{8}$/.test(val), {
    message: 'Enter a valid Ethiopian phone number (+2519..., +2517..., 09..., or 07...)',
  });

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Full name is required').max(120),
    email: z.string().trim().email('Enter a valid email address').optional(),
    phone: ethiopianPhoneSchema.optional(),
    password: z
      .string()
      .min(8, 'Use at least 8 characters')
      .max(128)
      .regex(/\d/, 'Include at least one number'),
  })
  .refine((data) => Boolean(data.email || data.phone), {
    message: 'Either email or phone number is required',
  });

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(3)
    .transform((v) => (v.includes('@') ? v.toLowerCase() : normalizeEthiopianPhone(v))),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(10),
});

export const otpRequestSchema = z.object({
  target: z
    .string()
    .trim()
    .min(3)
    .transform((v) => (v.includes('@') ? v.toLowerCase() : normalizeEthiopianPhone(v))),
  purpose: z.enum(['PHONE_VERIFY', 'PASSWORD_RESET']),
});

export const otpVerifySchema = z.object({
  target: z
    .string()
    .trim()
    .min(3)
    .transform((v) => (v.includes('@') ? v.toLowerCase() : normalizeEthiopianPhone(v))),
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit verification code'),
  purpose: z.enum(['PHONE_VERIFY', 'PASSWORD_RESET']),
});

export const passwordResetConfirmSchema = z.object({
  target: z
    .string()
    .trim()
    .min(3)
    .transform((v) => (v.includes('@') ? v.toLowerCase() : normalizeEthiopianPhone(v))),
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit verification code'),
  newPassword: z
    .string()
    .min(8, 'Use at least 8 characters')
    .max(128)
    .regex(/\d/, 'Include at least one number'),
});

export const createRoleSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[A-Z0-9_]+$/, 'Role code must be UPPER_SNAKE_CASE'),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(240).optional(),
  permissionCodes: z.array(z.string()).default([]),
});

export const updateRolePermissionsSchema = z.object({
  permissionCodes: z.array(z.string()),
});

export const createEmployeeSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  phone: ethiopianPhoneSchema.optional(),
  password: z.string().min(8).max(128),
  roleCodes: z.array(z.string()).min(1, 'Assign at least one role'),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']),
});

export const createOrderSchema = z.object({
  addressId: z.string().min(1),
  paymentMethod: z.enum(['CHAPA', 'COD', 'MOCK_ONLINE']),
  couponCode: z.string().trim().max(40).optional(),
  customerNote: z.string().trim().max(500).optional(),
});

export const stockAdjustmentSchema = z.object({
  warehouseId: z.string().min(1),
  variantId: z.string().min(1),
  direction: z.enum(['ADD', 'REMOVE']),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  reason: z.string().trim().min(3, 'Reason is required').max(200),
  notes: z.string().trim().max(500).optional(),
});

export const receiveStockSchema = z.object({
  warehouseId: z.string().min(1),
  variantId: z.string().min(1),
  quantity: z.number().int().positive('Quantity received must be at least 1'),
  unitCost: z.number().nonnegative().optional(),
  supplierReference: z.string().trim().max(120).optional(),
  reason: z.string().trim().min(3, 'Reason is required').max(200),
  notes: z.string().trim().max(500).optional(),
});

export const productVariantInputSchema = z.object({
  id: z.string().optional(),
  sku: z.string().trim().min(2).max(64),
  nameEn: z.string().trim().min(1).max(120),
  nameAm: z.string().trim().max(120).optional(),
  price: z.number().positive('Price must be positive'),
  compareAtPrice: z.number().positive().nullable().optional(),
  costPrice: z.number().nonnegative().nullable().optional(),
  isActive: z.boolean().default(true),
});

export const createProductSchema = z.object({
  categoryId: z.string().min(1),
  nameEn: z.string().trim().min(2).max(160),
  nameAm: z.string().trim().max(160).optional(),
  slug: z.string().trim().min(2).max(160).optional(),
  subtitleEn: z.string().trim().max(240).optional(),
  descriptionEn: z.string().trim().max(4000).optional(),
  brand: z.string().trim().max(120).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED']).default('DRAFT'),
  isFeatured: z.boolean().default(false),
  isReturnable: z.boolean().default(true),
  imageUrl: z.string().trim().max(500).optional(),
  variants: z.array(productVariantInputSchema).min(1, 'At least one sellable variant is required'),
});

export const updateProductSchema = createProductSchema.partial();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OtpRequestInput = z.infer<typeof otpRequestSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRolePermissionsInput = z.infer<typeof updateRolePermissionsSchema>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
export type ReceiveStockInput = z.infer<typeof receiveStockSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
