'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { formatEtb } from '@meskot/shared-types';
import { StorefrontHeader } from '@/components/storefront-header';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  paymentMethod: string;
  grandTotal: number;
  createdAt: string;
  items: Array<{
    id: string;
    productNameSnapshot: string;
    variantNameSnapshot: string;
    unitPrice: number;
    quantity: number;
  }>;
  shippingAddress: {
    streetAddress: string;
    city: string;
  } | null;
  payments: Array<{ status: string }>;
}

export default function OrderConfirmationPage() {
  const params = useParams<{ orderNumber: string }>();
  const user = useAuthStore((s) => s.user);
  const [order, setOrder] = useState<OrderDetail | null>(null);

  useEffect(() => {
    if (!user) return;
    apiFetch<OrderDetail>(`/orders/${params.orderNumber}`, { auth: true })
      .then(setOrder)
      .catch(() => {});
  }, [user, params.orderNumber]);

  const paymentStatus = order?.payments[0]?.status ?? 'PENDING';

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <StorefrontHeader />

      <main className="max-w-[1440px] w-full mx-auto px-6 lg:px-16 pt-8 pb-16 flex justify-center">
        <div className="w-full max-w-[880px] rounded-[14px] border border-border-subtle bg-surface p-6 lg:p-8 flex flex-col gap-5">
          <span className="self-start rounded-full bg-brand-tint px-3 py-1 text-[13px] font-medium text-brand">
            ✓ Order placed
          </span>

          <h1 className="text-[28px] font-bold text-ink">
            Thank you, {user?.fullName.split(' ')[0] ?? 'friend'}.
          </h1>
          <p className="text-[16px] text-muted">
            Your order is in. We’ll notify you as your order progresses.
          </p>

          {order && (
            <>
              <div className="flex items-center justify-between gap-4">
                <p className="text-[20px] font-semibold text-ink">Order #{order.orderNumber}</p>
                <p className="text-[13px] text-muted">
                  {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <span className="rounded-full bg-brand-tint px-3 py-1 text-[13px] font-medium text-brand">
                  Order · {order.status.replace(/_/g, ' ')}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-[13px] font-medium ${
                    paymentStatus === 'PAID'
                      ? 'bg-brand-tint text-brand'
                      : 'bg-warning-tint text-warning'
                  }`}
                >
                  Payment · {paymentStatus.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="flex flex-col gap-3 border-y border-border-subtle py-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[16px] font-semibold text-ink">
                        {item.productNameSnapshot}
                      </p>
                      <p className="text-[13px] text-muted">{item.variantNameSnapshot}</p>
                    </div>
                    <p className="text-[15px] text-ink">
                      {formatEtb(item.unitPrice)} × {item.quantity}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-[16px]">
                <span className="text-muted">
                  Total · {order.paymentMethod === 'COD' ? 'Pay on delivery' : 'Online payment'}
                </span>
                <span className="font-semibold text-ink">{formatEtb(order.grandTotal)}</span>
              </div>

              {order.shippingAddress && (
                <p className="text-[15px] text-muted">
                  Delivering to {order.shippingAddress.streetAddress}, {order.shippingAddress.city}.
                </p>
              )}
            </>
          )}

          <div className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-2">
            <h2 className="text-[20px] font-semibold text-ink">What happens next?</h2>
            <p className="text-[15px] text-muted">1 &nbsp;The store confirms your items.</p>
            <p className="text-[15px] text-muted">
              2 &nbsp;We prepare your order and assign a delivery agent.
            </p>
            <p className="text-[15px] text-muted">
              3 &nbsp;Follow every update in My orders.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/account/orders/${params.orderNumber}`}
              className="min-h-[48px] inline-flex items-center px-5 rounded-[10px] bg-brand text-[16px] font-semibold text-white hover:bg-brand-hover"
            >
              Track your order
            </Link>
            <Link
              href="/shop"
              className="min-h-[48px] inline-flex items-center px-5 rounded-[10px] border border-border-subtle bg-surface text-[16px] font-semibold text-ink hover:bg-canvas"
            >
              Continue shopping
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
