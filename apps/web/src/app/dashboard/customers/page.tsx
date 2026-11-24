'use client';

import { useEffect, useState } from 'react';
import { formatEtb } from '@meskot/shared-types';
import { StaffShell } from '@/components/staff-shell';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface CustomerRecord {
  id: string;
  user: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    status: string;
    createdAt: string;
  };
  orderCount: number;
  totalSpent: number;
  addresses: Array<{
    id: string;
    label: string;
    streetAddress: string;
    city: string;
    deliveryZone: { name: string } | null;
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    grandTotal: number;
    createdAt: string;
  }>;
}

export default function CustomersPage() {
  const user = useAuthStore((s) => s.user);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const qs = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
    setLoading(true);
    setError(null);
    apiFetch<CustomerRecord[]>(`/customers${qs}`, { auth: true })
      .then((data) => {
        setCustomers(data);
        if (data[0] && !selectedId) setSelectedId(data[0].id);
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Unable to load customers.'),
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, search]);

  const selected = customers.find((c) => c.id === selectedId) ?? customers[0] ?? null;

  return (
    <StaffShell title="Customers">
      <div>
        <h1 className="text-[28px] font-bold text-ink">Customers</h1>
        <p className="text-[13px] text-muted mt-1">
          Search customer accounts, saved delivery addresses, and order history.
        </p>
      </div>

      {error && (
        <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-4 items-start">
        <section className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-4">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, email, or phone..."
            className="min-h-[44px] w-full rounded-[10px] border border-border-subtle px-4 text-[14px] text-ink outline-none focus:border-brand"
          />

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-canvas text-muted">
                  <th className="py-3 px-3 font-medium">Customer</th>
                  <th className="py-3 px-3 font-medium">Phone / Email</th>
                  <th className="py-3 px-3 font-medium">Orders</th>
                  <th className="py-3 px-3 font-medium">Total spent</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted">
                      Loading customers...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted">
                      No customers found.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => {
                    const active = selected?.id === c.id;
                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedId(c.id)}
                        className={`border-b border-border-subtle cursor-pointer ${
                          active ? 'bg-brand-tint' : 'hover:bg-canvas/60'
                        }`}
                      >
                        <td className="py-3.5 px-3 font-medium text-ink">{c.user.fullName}</td>
                        <td className="py-3.5 px-3 text-muted">
                          {c.user.phone ?? c.user.email}
                        </td>
                        <td className="py-3.5 px-3 text-ink">{c.orderCount}</td>
                        <td className="py-3.5 px-3 font-medium text-ink">
                          {formatEtb(c.totalSpent)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {selected && (
          <aside className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-[20px] font-semibold text-ink">{selected.user.fullName}</h2>
              <p className="text-[13px] text-muted mt-1">
                {selected.user.email ?? '—'} · {selected.user.phone ?? '—'}
              </p>
            </div>

            <div className="border-t border-border-subtle pt-3 flex flex-col gap-2">
              <p className="text-[13px] font-semibold text-ink">Saved addresses</p>
              {selected.addresses.length === 0 ? (
                <p className="text-[13px] text-muted">No saved addresses.</p>
              ) : (
                selected.addresses.map((a) => (
                  <p key={a.id} className="text-[13px] text-muted">
                    <strong className="text-ink">{a.label}:</strong> {a.streetAddress}, {a.city}
                  </p>
                ))
              )}
            </div>

            <div className="border-t border-border-subtle pt-3 flex flex-col gap-2">
              <p className="text-[13px] font-semibold text-ink">Recent orders</p>
              {selected.recentOrders.length === 0 ? (
                <p className="text-[13px] text-muted">No orders placed yet.</p>
              ) : (
                selected.recentOrders.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between text-[13px] border-b border-border-subtle pb-2 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-ink">{o.orderNumber}</p>
                      <p className="text-[12px] text-muted">{o.status.replace(/_/g, ' ')}</p>
                    </div>
                    <span className="font-medium text-ink">{formatEtb(o.grandTotal)}</span>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}
      </div>
    </StaffShell>
  );
}
