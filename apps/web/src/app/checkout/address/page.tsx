'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatEtb } from '@meskot/shared-types';
import { StorefrontHeader } from '@/components/storefront-header';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface DeliveryZone {
  id: string;
  name: string;
  city: string;
  fee: number;
  freeDeliveryThreshold: number | null;
}

interface AddressRecord {
  id: string;
  label: string;
  recipientName: string;
  recipientPhone: string;
  city: string;
  streetAddress: string;
  landmark: string | null;
  deliveryZone: DeliveryZone | null;
}

interface CartSummary {
  itemCount: number;
  subtotal: number;
  items: Array<{ id: string; productName: string; quantity: number; lineTotal: number }>;
}

export default function CheckoutAddressPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [addresses, setAddresses] = useState<AddressRecord[]>([]);
  const [cart, setCart] = useState<CartSummary | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');

  const [label, setLabel] = useState('Home');
  const [recipientName, setRecipientName] = useState(user?.fullName ?? '');
  const [recipientPhone, setRecipientPhone] = useState(user?.phone ?? '+251911000003');
  const [deliveryZoneId, setDeliveryZoneId] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      apiFetch<DeliveryZone[]>('/delivery-zones'),
      apiFetch<AddressRecord[]>('/addresses', { auth: true }),
      apiFetch<CartSummary>('/cart', { auth: true }),
    ])
      .then(([z, addr, c]) => {
        setZones(z);
        setAddresses(addr);
        setCart(c);
        if (z[0]) setDeliveryZoneId(z[0].id);
        if (addr[0]) setSelectedAddressId(addr[0].id);
      })
      .catch(() => {});
  }, [user]);

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) ?? null;
  const activeZone =
    selectedAddress?.deliveryZone ?? zones.find((z) => z.id === deliveryZoneId) ?? null;
  const subtotal = cart?.subtotal ?? 0;
  const deliveryFee =
    activeZone &&
    activeZone.freeDeliveryThreshold &&
    subtotal >= activeZone.freeDeliveryThreshold
      ? 0
      : (activeZone?.fee ?? 150);

  async function handleAddAddress(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await apiFetch<AddressRecord>('/addresses', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({
          label,
          recipientName,
          recipientPhone,
          deliveryZoneId,
          streetAddress,
          isDefault: addresses.length === 0,
        }),
      });
      setAddresses((prev) => [created, ...prev]);
      setSelectedAddressId(created.id);
      setStreetAddress('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save address.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <StorefrontHeader cartCount={cart?.itemCount ?? 0} />

      <main className="max-w-[1440px] w-full mx-auto px-6 lg:px-16 pt-8 pb-16 flex flex-col gap-6">
        <h1 className="text-[28px] font-bold text-ink">Checkout</h1>

        {/* Progress steps (Figma 4:861) */}
        <div className="rounded-[14px] border border-border-subtle bg-surface p-6 grid grid-cols-3 gap-4 text-[16px]">
          <p className="font-semibold text-brand">1 &nbsp;Address</p>
          <p className="text-muted">2 &nbsp;Delivery</p>
          <p className="text-muted">3 &nbsp;Payment</p>
        </div>

        {error && (
          <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_416px] gap-4 items-start">
          <div className="flex flex-col gap-4">
            {addresses.length > 0 && (
              <section className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-4">
                <h2 className="text-[20px] font-semibold text-ink">Where should we deliver?</h2>
                {addresses.map((addr) => {
                  const active = addr.id === selectedAddressId;
                  return (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => setSelectedAddressId(addr.id)}
                      className={`w-full text-left rounded-[14px] border p-5 flex flex-col gap-2 transition-colors ${
                        active
                          ? 'bg-brand-tint border-brand'
                          : 'bg-surface border-border-subtle hover:bg-canvas'
                      }`}
                    >
                      <p className={`text-[16px] font-semibold ${active ? 'text-brand' : 'text-ink'}`}>
                        {active ? '◉' : '○'} {addr.label} · {addr.recipientName}
                      </p>
                      <p className="text-[15px] text-muted">
                        {addr.streetAddress}, {addr.city} · {addr.recipientPhone}
                      </p>
                      {addr.deliveryZone && (
                        <p className="text-[13px] text-brand">
                          Zone: {addr.deliveryZone.name} · Delivery {formatEtb(addr.deliveryZone.fee)}
                        </p>
                      )}
                    </button>
                  );
                })}
              </section>
            )}

            <section className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-4">
              <h2 className="text-[20px] font-semibold text-ink">Add a new address</h2>
              <form onSubmit={handleAddAddress} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium text-ink">Full name *</label>
                    <input
                      type="text"
                      required
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="Selam Abebe"
                      className="min-h-[48px] rounded-[10px] border border-border-subtle px-4 text-[16px] text-ink outline-none focus:border-brand"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium text-ink">Phone number *</label>
                    <input
                      type="tel"
                      required
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      placeholder="+251 911 234 567"
                      className="min-h-[48px] rounded-[10px] border border-border-subtle px-4 text-[16px] text-ink outline-none focus:border-brand"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium text-ink">Label</label>
                    <input
                      type="text"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      placeholder="Home / Work"
                      className="min-h-[48px] rounded-[10px] border border-border-subtle px-4 text-[16px] text-ink outline-none focus:border-brand"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium text-ink">Delivery zone *</label>
                    <select
                      required
                      value={deliveryZoneId}
                      onChange={(e) => setDeliveryZoneId(e.target.value)}
                      className="min-h-[48px] rounded-[10px] border border-border-subtle bg-surface px-4 text-[15px] text-ink outline-none focus:border-brand"
                    >
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.name} ({formatEtb(z.fee)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-ink">
                    Street, landmark and house number *
                  </label>
                  <input
                    type="text"
                    required
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder="Bole, near Edna Mall · House 128"
                    className="min-h-[48px] rounded-[10px] border border-border-subtle px-4 text-[16px] text-ink outline-none focus:border-brand"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="min-h-[48px] px-5 rounded-[10px] border border-border-subtle bg-surface text-[16px] font-semibold text-ink hover:bg-canvas"
                  >
                    {saving ? 'Saving...' : 'Save address'}
                  </button>
                  <button
                    type="button"
                    disabled={!selectedAddressId}
                    onClick={() =>
                      router.push(`/checkout/payment?addressId=${encodeURIComponent(selectedAddressId)}`)
                    }
                    className="min-h-[48px] px-5 rounded-[10px] bg-brand text-[16px] font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
                  >
                    Continue to payment →
                  </button>
                </div>
              </form>
            </section>
          </div>

          <aside className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-4">
            <h2 className="text-[20px] font-semibold text-ink">Order summary</h2>
            {cart?.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-[15px]">
                <span className="text-muted">
                  {item.productName} × {item.quantity}
                </span>
                <span className="text-ink">{formatEtb(item.lineTotal)}</span>
              </div>
            ))}
            <div className="h-px bg-border-subtle" />
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
              <span>{formatEtb(subtotal + deliveryFee)}</span>
            </div>
            <Link href="/cart" className="text-[13px] text-brand hover:underline">
              ← Edit cart
            </Link>
          </aside>
        </div>
      </main>
    </div>
  );
}
