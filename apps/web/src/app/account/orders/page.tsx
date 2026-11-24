'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatEtb } from '@meskot/shared-types';
import { StorefrontHeader } from '@/components/storefront-header';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  paymentMethod: string;
  grandTotal: number;
  createdAt: string;
  items: Array<{ id: string; productNameSnapshot: string; quantity: number }>;
  payments: Array<{ status: string }>;
}

export default function MyOrdersPage() {
  const user = useAuthStore((s) => s.user);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    apiFetch<OrderSummary[]>('/orders', { auth: true })
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <StorefrontHeader />
      <main className="max-w-[1440px] w-full mx-auto px-6 lg:px-16 pt-8 pb-16 flex flex-col gap-6">
        <h1 className="text-[28px] font-bold text-ink">My orders</h1>

        {loading ? (
          <div className="rounded-[14px] border border-border-subtle bg-surface p-8 text-muted">
            Loading your orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-[14px] border border-border-subtle bg-surface p-10 flex flex-col items-start gap-3">
            <p className="text-[18px] font-semibold text-ink">No orders yet</p>
            <Link href="/shop" className="text-[15px] font-semibold text-brand hover:underline">
              Start shopping →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-wrap items-center justify-between gap-4"
              >
                <div className="flex flex-col gap-1.5">
                  <p className="text-[18px] font-semibold text-ink">Order #{order.orderNumber}</p>
                  <p className="text-[13px] text-muted">
                    {new Date(order.createdAt).toLocaleString()} · {order.items.length} line item(s)
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="rounded-full bg-brand-tint px-3 py-0.5 text-[12px] font-medium text-brand">
                      Order · {order.status.replace(/_/g, ' ')}
                    </span>
                    <span className="rounded-full bg-warning-tint px-3 py-0.5 text-[12px] font-medium text-warning">
                      Payment · {(order.payments[0]?.status ?? 'PENDING').replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <p className="text-[18px] font-bold text-ink">{formatEtb(order.grandTotal)}</p>
                  <Link
                    href={`/account/orders/${order.orderNumber}`}
                    className="min-h-[44px] inline-flex items-center px-4 rounded-[10px] border border-border-subtle bg-surface text-[14px] font-semibold text-ink hover:bg-canvas"
                  >
                    Track order →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
