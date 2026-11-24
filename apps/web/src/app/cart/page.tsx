'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatEtb } from '@meskot/shared-types';
import { StorefrontHeader } from '@/components/storefront-header';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { resolveProductImage } from '@/lib/product-images';

interface CartItem {
  id: string;
  variantId: string;
  sku: string;
  productSlug: string;
  productName: string;
  variantName: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  availableQuantity: number;
}

interface CartResponse {
  id: string;
  itemCount: number;
  subtotal: number;
  items: CartItem[];
}

export default function CartPage() {
  const user = useAuthStore((s) => s.user);
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    apiFetch<CartResponse>('/cart', { auth: true })
      .then(setCart)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Unable to load cart.'))
      .finally(() => setLoading(false));
  }, [user]);

  async function updateQty(itemId: string, quantity: number) {
    setError(null);
    try {
      const updated = await apiFetch<CartResponse>(`/cart/items/${itemId}`, {
        method: 'PATCH',
        auth: true,
        body: JSON.stringify({ quantity }),
      });
      setCart(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update quantity.');
    }
  }

  async function removeItem(itemId: string) {
    setError(null);
    try {
      const updated = await apiFetch<CartResponse>(`/cart/items/${itemId}`, {
        method: 'DELETE',
        auth: true,
      });
      setCart(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to remove item.');
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <StorefrontHeader cartCount={cart?.itemCount ?? 0} />

      <main className="max-w-[1440px] w-full mx-auto px-6 lg:px-16 pt-8 pb-16 flex flex-col gap-6">
        <p className="text-[13px] text-muted">
          <Link href="/" className="hover:underline">
            Home
          </Link>{' '}
          / <span className="text-ink">Shopping cart</span>
        </p>

        <div>
          <h1 className="text-[28px] font-bold text-ink">Your cart</h1>
          <p className="text-[16px] text-muted mt-1">
            {cart ? `${cart.itemCount} item(s), one step closer to yours.` : 'Review your items.'}
          </p>
        </div>

        {error && (
          <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
            {error}
          </div>
        )}

        {!user ? (
          <div className="rounded-[14px] border border-border-subtle bg-surface p-10 flex flex-col items-start gap-4">
            <h2 className="text-[20px] font-semibold text-ink">Sign in to view your cart</h2>
            <p className="text-[15px] text-muted">
              Your cart persists securely across sessions once signed in.
            </p>
            <Link
              href="/auth/sign-in"
              className="min-h-[48px] inline-flex items-center px-6 rounded-[10px] bg-brand text-[16px] font-semibold text-white"
            >
              Sign in
            </Link>
          </div>
        ) : loading ? (
          <div className="rounded-[14px] border border-border-subtle bg-surface p-10 text-[15px] text-muted">
            Loading your cart...
          </div>
        ) : !cart || cart.items.length === 0 ? (
          <div className="rounded-[14px] border border-border-subtle bg-surface p-10 flex flex-col items-start gap-4">
            <h2 className="text-[20px] font-semibold text-ink">Your cart is empty</h2>
            <p className="text-[15px] text-muted">
              Explore everyday essentials and add items to your cart.
            </p>
            <Link
              href="/shop"
              className="min-h-[48px] inline-flex items-center px-6 rounded-[10px] bg-brand text-[16px] font-semibold text-white"
            >
              Explore the collection →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_416px] gap-4 items-start">
            <div className="flex flex-col gap-4">
              <section className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-5">
                {cart.items.map((item, idx) => (
                  <div key={item.id}>
                    {idx > 0 && <div className="h-px bg-border-subtle mb-5" />}
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-4">
                      <img
                        src={resolveProductImage(
                          item.productSlug,
                          item.imageUrl ? [{ url: item.imageUrl }] : null,
                        )}
                        alt={item.productName}
                        className="size-[96px] rounded-[10px] object-cover bg-canvas shrink-0"
                      />
                      <div className="flex-1 min-w-[180px] flex flex-col gap-1">
                        <Link
                          href={`/products/${item.productSlug}`}
                          className="text-[16px] font-semibold text-ink hover:text-brand"
                        >
                          {item.productName}
                        </Link>
                        <p className="text-[13px] text-muted">{item.variantName}</p>
                        <p className="text-[16px] font-medium text-ink">
                          {formatEtb(item.unitPrice)}
                        </p>
                      </div>

                      <div className="inline-flex items-center min-h-[48px] rounded-[10px] border border-border-subtle bg-surface">
                        <button
                          type="button"
                          onClick={() => updateQty(item.id, item.quantity - 1)}
                          className="px-4 py-2 text-[16px] font-semibold text-ink hover:bg-canvas"
                        >
                          −
                        </button>
                        <span className="px-3 text-[16px] font-semibold text-ink">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQty(item.id, item.quantity + 1)}
                          className="px-4 py-2 text-[16px] font-semibold text-ink hover:bg-canvas"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="min-h-[48px] px-4 rounded-[10px] border border-border-subtle bg-surface text-[15px] font-semibold text-ink hover:bg-canvas"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </section>

              <div>
                <Link
                  href="/shop"
                  className="inline-flex items-center min-h-[48px] px-5 rounded-[10px] border border-border-subtle bg-surface text-[16px] font-semibold text-ink hover:bg-canvas"
                >
                  ← Continue shopping
                </Link>
              </div>
            </div>

            <aside className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-4">
              <h2 className="text-[20px] font-semibold text-ink">Order summary</h2>
              {cart.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-[15px]">
                  <span className="text-muted">
                    {item.productName} × {item.quantity}
                  </span>
                  <span className="text-ink">{formatEtb(item.lineTotal)}</span>
                </div>
              ))}
              <div className="h-px bg-border-subtle" />
              <div className="flex items-center justify-between text-[16px]">
                <span className="text-muted">Subtotal</span>
                <span className="font-semibold text-ink">{formatEtb(cart.subtotal)}</span>
              </div>
              <p className="text-[13px] text-muted">
                Delivery fee is calculated by your delivery zone at checkout.
              </p>
              <Link
                href="/checkout/address"
                className="min-h-[48px] w-full inline-flex items-center justify-center rounded-[10px] bg-brand px-5 text-[16px] font-semibold text-white hover:bg-brand-hover transition-colors"
              >
                Proceed to checkout →
              </Link>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
