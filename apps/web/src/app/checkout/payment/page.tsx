'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatEtb } from '@meskot/shared-types';
import { StorefrontHeader } from '@/components/storefront-header';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { resolveProductImage } from '@/lib/product-images';

interface AddressRecord {
  id: string;
  label: string;
  recipientName: string;
  recipientPhone: string;
  city: string;
  streetAddress: string;
  deliveryZone: { name: string; fee: number; freeDeliveryThreshold: number | null } | null;
}

interface CartResponse {
  itemCount: number;
  subtotal: number;
  items: Array<{
    id: string;
    productSlug: string;
    productName: string;
    variantName: string;
    imageUrl: string | null;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }>;
}

function CheckoutPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const addressId = searchParams.get('addressId') ?? '';

  const [address, setAddress] = useState<AddressRecord | null>(null);
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'CHAPA'>('COD');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stable idempotency key per checkout attempt (ORD-06)
  const idempotencyKeyRef = useRef<string>(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  useEffect(() => {
    if (!user) return;
    Promise.all([
      apiFetch<AddressRecord[]>('/addresses', { auth: true }),
      apiFetch<CartResponse>('/cart', { auth: true }),
    ])
      .then(([addrs, c]) => {
        setAddress(addrs.find((a) => a.id === addressId) ?? addrs[0] ?? null);
        setCart(c);
      })
      .catch(() => {});
  }, [user, addressId]);

  const subtotal = cart?.subtotal ?? 0;
  const zone = address?.deliveryZone;
  const deliveryFee =
    zone && zone.freeDeliveryThreshold && subtotal >= zone.freeDeliveryThreshold
      ? 0
      : (zone?.fee ?? 150);
  const grandTotal = subtotal + deliveryFee;

  async function handlePlaceOrder() {
    if (!address) return;
    setPlacing(true);
    setError(null);
    try {
      const order = await apiFetch<{ id: string; orderNumber: string }>('/orders', {
        method: 'POST',
        auth: true,
        headers: { 'Idempotency-Key': idempotencyKeyRef.current },
        body: JSON.stringify({
          addressId: address.id,
          paymentMethod,
        }),
      });

      if (paymentMethod === 'COD') {
        router.push(`/orders/${order.orderNumber}/confirmation`);
        return;
      }

      const init = await apiFetch<{ checkoutUrl: string }>('/payments/initialize', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({ orderId: order.id }),
      });

      window.location.href = init.checkoutUrl;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to place order.');
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <StorefrontHeader cartCount={cart?.itemCount ?? 0} />

      <main className="max-w-[1440px] w-full mx-auto px-6 lg:px-16 pt-8 pb-16 flex flex-col gap-6">
        <h1 className="text-[28px] font-bold text-ink">Review and pay</h1>

        <div className="rounded-[14px] border border-border-subtle bg-surface p-6 grid grid-cols-3 gap-4 text-[16px]">
          <p className="text-muted">✓ &nbsp;Address</p>
          <p className="text-muted">✓ &nbsp;Delivery</p>
          <p className="font-semibold text-brand">3 &nbsp;Payment</p>
        </div>

        {error && (
          <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_416px] gap-4 items-start">
          <div className="flex flex-col gap-4">
            {address && (
              <section className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-3">
                <h2 className="text-[20px] font-semibold text-ink">
                  ✓ Delivering to {address.label}
                </h2>
                <p className="text-[15px] text-muted">
                  {address.recipientName} · {address.recipientPhone}
                  <br />
                  {address.streetAddress}, {address.city}
                </p>
                <div className="flex items-center justify-between text-[15px]">
                  <span className="text-muted">
                    Standard delivery · {zone?.name ?? 'Addis Ababa'}
                  </span>
                  <span className="text-ink font-medium">
                    {deliveryFee === 0 ? 'Free' : formatEtb(deliveryFee)}
                  </span>
                </div>
                <div>
                  <Link
                    href="/checkout/address"
                    className="inline-flex items-center min-h-[44px] px-4 rounded-[10px] border border-border-subtle text-[14px] font-semibold text-ink hover:bg-canvas"
                  >
                    Change address or delivery
                  </Link>
                </div>
              </section>
            )}

            {/* Payment method (Figma 4:944) */}
            <section className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-4">
              <h2 className="text-[20px] font-semibold text-ink">How would you like to pay?</h2>

              <button
                type="button"
                onClick={() => setPaymentMethod('CHAPA')}
                className={`w-full text-left rounded-[14px] border p-5 flex flex-col gap-1.5 transition-colors ${
                  paymentMethod === 'CHAPA'
                    ? 'bg-brand-tint border-brand'
                    : 'bg-surface border-border-subtle hover:bg-canvas'
                }`}
              >
                <span
                  className={`text-[16px] font-semibold ${
                    paymentMethod === 'CHAPA' ? 'text-brand' : 'text-ink'
                  }`}
                >
                  {paymentMethod === 'CHAPA' ? '◉' : '○'} Pay online (Chapa)
                </span>
                <span className="text-[13px] text-muted">
                  Continue to secure payment after placing your order. Stock is held for 15 minutes.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('COD')}
                className={`w-full text-left rounded-[14px] border p-5 flex flex-col gap-1.5 transition-colors ${
                  paymentMethod === 'COD'
                    ? 'bg-brand-tint border-brand'
                    : 'bg-surface border-border-subtle hover:bg-canvas'
                }`}
              >
                <span
                  className={`text-[16px] font-semibold ${
                    paymentMethod === 'COD' ? 'text-brand' : 'text-ink'
                  }`}
                >
                  {paymentMethod === 'COD' ? '◉' : '○'} Cash on delivery
                </span>
                <span className="text-[15px] text-muted">
                  Pay {formatEtb(grandTotal)} when your order arrives.
                </span>
              </button>

              <p className="text-[13px] text-muted">No extra cash-on-delivery fee.</p>
            </section>

            {/* Your items */}
            {cart && (
              <section className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-4">
                <h2 className="text-[20px] font-semibold text-ink">Your items</h2>
                {cart.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4">
                    <img
                      src={resolveProductImage(
                        item.productSlug,
                        item.imageUrl ? [{ url: item.imageUrl }] : null,
                      )}
                      alt={item.productName}
                      className="size-[72px] rounded-[10px] object-cover bg-canvas shrink-0"
                    />
                    <div className="flex-1">
                      <p className="text-[16px] font-semibold text-ink">{item.productName}</p>
                      <p className="text-[13px] text-muted">{item.variantName}</p>
                      <p className="text-[15px] font-medium text-ink">
                        {formatEtb(item.unitPrice)}
                      </p>
                    </div>
                    <p className="text-[15px] text-muted">× {item.quantity}</p>
                  </div>
                ))}
              </section>
            )}
          </div>

          <aside className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-4">
            <h2 className="text-[20px] font-semibold text-ink">Order summary</h2>
            <div className="flex items-center justify-between text-[15px]">
              <span className="text-muted">Subtotal</span>
              <span className="text-ink">{formatEtb(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-[15px]">
              <span className="text-muted">Delivery</span>
              <span className="text-ink">{deliveryFee === 0 ? 'Free' : formatEtb(deliveryFee)}</span>
            </div>
            <div className="h-px bg-border-subtle" />
            <div className="flex items-center justify-between text-[18px] font-bold text-ink">
              <span>Total</span>
              <span>{formatEtb(grandTotal)}</span>
            </div>
            <button
              type="button"
              disabled={placing || !address || !cart || cart.items.length === 0}
              onClick={handlePlaceOrder}
              className="min-h-[48px] w-full rounded-[10px] bg-brand px-5 text-[16px] font-semibold text-white hover:bg-brand-hover disabled:opacity-50 transition-colors"
            >
              {placing
                ? 'Placing order...'
                : paymentMethod === 'COD'
                  ? `Place order · ${formatEtb(grandTotal)}`
                  : `Continue to pay · ${formatEtb(grandTotal)}`}
            </button>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default function CheckoutPaymentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <CheckoutPaymentContent />
    </Suspense>
  );
}
