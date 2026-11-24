'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { formatEtb } from '@meskot/shared-types';
import { StorefrontHeader } from '@/components/storefront-header';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface OrderTrackingDetail {
  id: string;
  orderNumber: string;
  status: string;
  paymentMethod: string;
  subtotal: number;
  deliveryFee: number;
  grandTotal: number;
  createdAt: string;
  items: Array<{
    id: string;
    productNameSnapshot: string;
    variantNameSnapshot: string;
    skuSnapshot: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }>;
  shippingAddress: {
    recipientName: string;
    recipientPhone: string;
    streetAddress: string;
    city: string;
    zoneName: string | null;
  } | null;
  payments: Array<{ status: string }>;
  delivery: { status: string; trackingCode: string } | null;
}

const TRACKING_STEPS = [
  { key: 'CONFIRMED', label: 'Order confirmed' },
  { key: 'PROCESSING', label: 'Preparing items' },
  { key: 'READY_FOR_DELIVERY', label: 'Ready for delivery' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for delivery' },
  { key: 'DELIVERED', label: 'Delivered' },
];

export default function OrderTrackingPage() {
  const params = useParams<{ orderNumber: string }>();
  const user = useAuthStore((s) => s.user);
  const [order, setOrder] = useState<OrderTrackingDetail | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    apiFetch<OrderTrackingDetail>(`/orders/${params.orderNumber}`, { auth: true })
      .then(setOrder)
      .catch(() => {});
  }, [user, params.orderNumber]);

  const currentStepIdx = order
    ? TRACKING_STEPS.findIndex((s) => s.key === order.status)
    : -1;
  const canCancel =
    order && ['PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING'].includes(order.status);

  async function handleCancel() {
    if (!order) return;
    setCancelling(true);
    setError(null);
    try {
      const updated = await apiFetch<OrderTrackingDetail>(
        `/orders/${order.orderNumber}/cancel`,
        {
          method: 'POST',
          auth: true,
          body: JSON.stringify({ reason: 'Customer requested cancellation' }),
        },
      );
      setOrder(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to cancel order.');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <StorefrontHeader />
      <main className="max-w-[1440px] w-full mx-auto px-6 lg:px-16 pt-8 pb-16 flex flex-col gap-6">
        <Link href="/account/orders" className="text-[13px] font-medium text-brand hover:underline">
          ← Back to My orders
        </Link>

        {!order ? (
          <div className="rounded-[14px] border border-border-subtle bg-surface p-8 text-muted">
            Loading order details...
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-[28px] font-bold text-ink">Order #{order.orderNumber}</h1>
                <p className="text-[14px] text-muted mt-1">
                  Tracking code: {order.delivery?.trackingCode ?? '—'} · Placed{' '}
                  {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>
              {canCancel && (
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={handleCancel}
                  className="min-h-[44px] px-4 rounded-[10px] border border-border-subtle bg-surface text-[14px] font-semibold text-warning hover:bg-warning-tint/40"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel order'}
                </button>
              )}
              {(order.status === 'DELIVERED' || order.status === 'COMPLETED') && (
                <Link
                  href={`/account/orders/${order.orderNumber}/return`}
                  className="inline-flex items-center min-h-[44px] px-4 rounded-[10px] border border-border-subtle bg-surface text-[14px] font-semibold text-ink hover:bg-canvas"
                >
                  Request return
                </Link>
              )}
            </div>

            {error && (
              <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
                {error}
              </div>
            )}

            {/* Status timeline */}
            <section className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-4">
              <div className="flex flex-wrap gap-3">
                <span className="rounded-full bg-brand-tint px-3 py-1 text-[13px] font-medium text-brand">
                  Order · {order.status.replace(/_/g, ' ')}
                </span>
                <span className="rounded-full bg-warning-tint px-3 py-1 text-[13px] font-medium text-warning">
                  Payment · {(order.payments[0]?.status ?? 'PENDING').replace(/_/g, ' ')}
                </span>
                {order.delivery && (
                  <span className="rounded-full bg-canvas px-3 py-1 text-[13px] font-medium text-ink">
                    Delivery · {order.delivery.status.replace(/_/g, ' ')}
                  </span>
                )}
              </div>

              {order.status !== 'CANCELLED' && (
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
                  {TRACKING_STEPS.map((step, idx) => {
                    const done = currentStepIdx >= idx || order.status === 'COMPLETED';
                    return (
                      <div
                        key={step.key}
                        className={`rounded-[10px] border p-3 text-[13px] ${
                          done
                            ? 'bg-brand-tint border-brand text-brand font-semibold'
                            : 'bg-surface border-border-subtle text-muted'
                        }`}
                      >
                        {done ? '✓ ' : `${idx + 1}. `}
                        {step.label}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Items & Address */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 items-start">
              <section className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-4">
                <h2 className="text-[20px] font-semibold text-ink">Items ordered</h2>
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between border-b border-border-subtle pb-3 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="text-[15px] font-semibold text-ink">
                        {item.productNameSnapshot}
                      </p>
                      <p className="text-[13px] text-muted">
                        {item.variantNameSnapshot} · SKU {item.skuSnapshot}
                      </p>
                    </div>
                    <p className="text-[15px] font-medium text-ink">
                      {formatEtb(item.unitPrice)} × {item.quantity}
                    </p>
                  </div>
                ))}
              </section>

              <aside className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-3">
                <h2 className="text-[20px] font-semibold text-ink">Summary</h2>
                {order.shippingAddress && (
                  <p className="text-[14px] text-muted">
                    <strong className="text-ink">{order.shippingAddress.recipientName}</strong>
                    <br />
                    {order.shippingAddress.streetAddress}, {order.shippingAddress.city}
                    <br />
                    {order.shippingAddress.recipientPhone}
                  </p>
                )}
                <div className="h-px bg-border-subtle my-1" />
                <div className="flex justify-between text-[14px]">
                  <span className="text-muted">Subtotal</span>
                  <span className="text-ink">{formatEtb(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-[14px]">
                  <span className="text-muted">Delivery</span>
                  <span className="text-ink">{formatEtb(order.deliveryFee)}</span>
                </div>
                <div className="flex justify-between text-[17px] font-bold text-ink pt-1">
                  <span>Total</span>
                  <span>{formatEtb(order.grandTotal)}</span>
                </div>
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
