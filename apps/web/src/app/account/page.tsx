'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatEtb } from '@meskot/shared-types';
import { StorefrontHeader } from '@/components/storefront-header';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface AddressRecord {
  id: string;
  label: string;
  recipientName: string;
  recipientPhone: string;
  city: string;
  streetAddress: string;
  deliveryZone: { name: string; fee: number } | null;
}

export default function AccountPage() {
  const user = useAuthStore((s) => s.user);
  const [addresses, setAddresses] = useState<AddressRecord[]>([]);

  useEffect(() => {
    if (!user) return;
    apiFetch<AddressRecord[]>('/addresses', { auth: true })
      .then(setAddresses)
      .catch(() => {});
  }, [user]);

  async function handleDelete(id: string) {
    await apiFetch(`/addresses/${id}`, { method: 'DELETE', auth: true });
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <StorefrontHeader />
      <main className="max-w-[1440px] w-full mx-auto px-6 lg:px-16 pt-8 pb-16 flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-bold text-ink">Account &amp; addresses</h1>
            <p className="text-[15px] text-muted mt-1">
              Manage your profile details, saved delivery addresses, and orders.
            </p>
          </div>
          <Link
            href="/account/orders"
            className="min-h-[48px] inline-flex items-center px-5 rounded-[10px] bg-brand text-[15px] font-semibold text-white hover:bg-brand-hover"
          >
            View my orders →
          </Link>
        </div>

        {!user ? (
          <div className="rounded-[14px] border border-border-subtle bg-surface p-8">
            <Link href="/auth/sign-in" className="text-brand font-semibold hover:underline">
              Sign in to manage your account →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 items-start">
            <section className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-3">
              <h2 className="text-[20px] font-semibold text-ink">Profile</h2>
              <p className="text-[16px] font-medium text-ink">{user.fullName}</p>
              {user.email && <p className="text-[14px] text-muted">{user.email}</p>}
              {user.phone && <p className="text-[14px] text-muted">{user.phone}</p>}
            </section>

            <section className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[20px] font-semibold text-ink">Saved delivery addresses</h2>
                <Link
                  href="/checkout/address"
                  className="text-[14px] font-semibold text-brand hover:underline"
                >
                  + Add address
                </Link>
              </div>
              {addresses.length === 0 ? (
                <p className="text-[14px] text-muted">No saved addresses yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className="rounded-[14px] border border-border-subtle p-4 flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-[15px] font-semibold text-ink">
                          {addr.label} · {addr.recipientName}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleDelete(addr.id)}
                          className="text-[12px] text-muted hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                      <p className="text-[14px] text-muted">
                        {addr.streetAddress}, {addr.city}
                      </p>
                      <p className="text-[13px] text-muted">{addr.recipientPhone}</p>
                      {addr.deliveryZone && (
                        <p className="text-[12px] text-brand">
                          {addr.deliveryZone.name} · {formatEtb(addr.deliveryZone.fee)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
