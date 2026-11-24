export type OrderStatusType =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'READY_FOR_DELIVERY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED';

export type PaymentStatusType =
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'COD_PENDING'
  | 'COD_COLLECTED'
  | 'COD_RECONCILED';

export type DeliveryStatusType =
  | 'UNASSIGNED'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED_ATTEMPT'
  | 'RETURNED';

export type RefundStatusType =
  | 'REQUESTED'
  | 'APPROVED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'REJECTED';

export const ORDER_TRANSITIONS: Record<OrderStatusType, readonly OrderStatusType[]> = {
  PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['READY_FOR_DELIVERY', 'CANCELLED'],
  READY_FOR_DELIVERY: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const PAYMENT_TRANSITIONS: Record<PaymentStatusType, readonly PaymentStatusType[]> = {
  PENDING: ['PAID', 'FAILED'],
  PAID: ['PARTIALLY_REFUNDED', 'REFUNDED'],
  PARTIALLY_REFUNDED: ['REFUNDED'],
  FAILED: [],
  COD_PENDING: ['COD_COLLECTED', 'FAILED'],
  COD_COLLECTED: ['COD_RECONCILED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
  COD_RECONCILED: ['REFUNDED', 'PARTIALLY_REFUNDED'],
  REFUNDED: [],
};

export const DELIVERY_TRANSITIONS: Record<DeliveryStatusType, readonly DeliveryStatusType[]> = {
  UNASSIGNED: ['ASSIGNED'],
  ASSIGNED: ['PICKED_UP', 'UNASSIGNED'],
  PICKED_UP: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED_ATTEMPT'],
  FAILED_ATTEMPT: ['OUT_FOR_DELIVERY', 'RETURNED'],
  DELIVERED: [],
  RETURNED: [],
};

export const REFUND_TRANSITIONS: Record<RefundStatusType, readonly RefundStatusType[]> = {
  REQUESTED: ['APPROVED', 'REJECTED'],
  APPROVED: ['PROCESSING'],
  PROCESSING: ['COMPLETED', 'REJECTED'],
  COMPLETED: [],
  REJECTED: [],
};

export function canTransitionOrder(from: OrderStatusType, to: OrderStatusType): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export function canTransitionPayment(from: PaymentStatusType, to: PaymentStatusType): boolean {
  return PAYMENT_TRANSITIONS[from].includes(to);
}

export function canTransitionDelivery(from: DeliveryStatusType, to: DeliveryStatusType): boolean {
  return DELIVERY_TRANSITIONS[from].includes(to);
}

export function canTransitionRefund(from: RefundStatusType, to: RefundStatusType): boolean {
  return REFUND_TRANSITIONS[from].includes(to);
}
