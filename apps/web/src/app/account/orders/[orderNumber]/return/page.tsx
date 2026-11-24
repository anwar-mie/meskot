'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { formatEtb } from '@meskot/shared-types';
import { StorefrontHeader } from '@/components/storefront-header';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface OrderItem {
  id: string;
  productNameSnapshot: string;
  variantNameSnapshot: string;
  unitPrice: number;
  quantity: number;
}

interface OrderDetail {
  orderNumber: string;
  items: OrderItem[];
}

export default function RequestReturnPage() {
  const params = useParams<{ orderNumber: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [reason, setReason] = useState('Item arrived damaged');
  const [customerNote, setCustomerNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!user) return;
    apiFetch<OrderDetail>(`/orders/${params.orderNumber}`, { auth: true })
      .then((data) => {
        setOrder(data);
        if (data.items[0]) setSelectedItemIds([data.items[0].id]);
      })
      .catch(() => {});
  }, [user, params.orderNumber]);

  function toggleItem(id: string) {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  const selectedItems = order?.items.filter((i) => selectedItemIds.includes(i.id)) ?? [];
  const selectedTotal = selectedItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!order || selectedItems.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch('/returns', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({
          orderNumber: order.orderNumber,
          reason,
          customerNote: customerNote.trim() || undefined,
          items: selectedItems.map((i) => ({ orderItemId: i.id, quantity: i.quantity })),
        }),
      });
      setSubmitted(true);
      setTimeout(() => router.push(`/account/orders/${order.orderNumber}`), 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to submit return request.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <StorefrontHeader />
      <main className="max-w-[1440px] w-full mx-auto px-6 lg:px-16 pt-8 pb-16 flex flex-col gap-6">
        <p className="text-[13px] text-muted">
          <Link href="/account/orders" className="hover:underline">
            My account
          </Link>{' '}
          / <span className="text-ink">Request return</span>
        </p>

        <h1 className="text-[28px] font-bold text-ink">Request return</h1>
        <p className="text-[16px] text-muted">Order #{params.orderNumber}</p>

        {error && (
          <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
            {error}
          </div>
        )}
        {submitted && (
          <div className="rounded-[10px] border border-brand/30 bg-brand-tint px-4 py-3 text-[14px] text-brand font-medium">
            ✓ Return request submitted. Our team will review and notify you shortly.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_416px] gap-4 items-start">
          <form
            onSubmit={handleSubmit}
            className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-4"
          >
            <h2 className="text-[20px] font-semibold text-ink">What would you like to return?</h2>

            {order?.items.map((item) => {
              const checked = selectedItemIds.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  className={`w-full text-left rounded-[12px] border p-4 flex items-center justify-between gap-4 transition-colors ${
                    checked ? 'bg-brand-tint border-brand' : 'bg-surface border-border-subtle'
                  }`}
                >
                  <div>
                    <p className="text-[16px] font-semibold text-ink">
                      {checked ? '✓ ' : '○ '}
                      {item.productNameSnapshot}
                    </p>
                    <p className="text-[13px] text-muted">
                      {item.variantNameSnapshot} · Qty {item.quantity}
                    </p>
                  </div>
                  <p className="text-[15px] font-medium text-ink">
                    {formatEtb(item.unitPrice * item.quantity)}
                  </p>
                </button>
              );
            })}

            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-ink">Reason for return *</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[48px] rounded-[14px] border border-border-subtle bg-surface px-4 text-[16px] text-ink outline-none focus:border-brand"
              >
                <option value="Item arrived damaged">Item arrived damaged</option>
                <option value="Wrong item or variant received">Wrong item or variant received</option>
                <option value="Item does not match description">Item does not match description</option>
                <option value="Changed my mind">Changed my mind</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-ink">Tell us what happened</label>
              <textarea
                rows={3}
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                placeholder="Describe the issue..."
                className="rounded-[14px] border border-border-subtle p-4 text-[15px] text-ink outline-none focus:border-brand"
              />
            </div>

            <p className="text-[13px] text-muted">
              Your request will be reviewed before a return or refund is approved.
            </p>

            <div>
              <button
                type="submit"
                disabled={submitting || selectedItems.length === 0}
                className="min-h-[48px] px-6 rounded-[10px] bg-brand text-[16px] font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Request return'}
              </button>
            </div>
          </form>

          <aside className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-4">
            <h2 className="text-[20px] font-semibold text-ink">Return summary</h2>
            <p className="text-[16px] font-semibold text-ink">
              {selectedItems.length} item(s) · {formatEtb(selectedTotal)}
            </p>
            <p className="text-[13px] text-muted">
              Any refund amount is confirmed after review. Delivery fee refund depends on the return
              decision.
            </p>
            <h3 className="text-[20px] font-semibold text-ink pt-2">What happens next?</h3>
            <p className="text-[15px] text-muted">1 &nbsp;Requested · We receive your request</p>
            <p className="text-[15px] text-muted">2 &nbsp;Approved or rejected · You’re notified</p>
            <p className="text-[15px] text-muted">3 &nbsp;Refunded · If your refund is approved</p>
          </aside>
        </div>
      </main>
    </div>
  );
}
