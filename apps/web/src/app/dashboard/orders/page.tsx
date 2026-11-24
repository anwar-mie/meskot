'use client';

import { useEffect, useState } from 'react';
import {
  formatEtb,
  ORDER_TRANSITIONS,
  type OrderStatusType,
} from '@meskot/shared-types';
import { StaffShell } from '@/components/staff-shell';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface StaffOrder {
  id: string;
  orderNumber: string;
  status: OrderStatusType;
  paymentMethod: string;
  grandTotal: number;
  createdAt: string;
  customer: { fullName: string; phone: string | null; email: string | null };
  shippingAddress: { streetAddress: string; city: string; zoneName: string | null } | null;
  payment: { id: string; status: string; amount: number } | null;
  delivery: {
    id: string;
    status: string;
    trackingCode: string;
    assignedAgent: { id: string; fullName: string } | null;
  } | null;
  items: Array<{
    id: string;
    productNameSnapshot: string;
    variantNameSnapshot: string;
    quantity: number;
    unitPrice: number;
  }>;
}

interface DeliveryAgent {
  id: string;
  fullName: string;
  phone: string | null;
}

export default function StaffOrdersPage() {
  const user = useAuthStore((s) => s.user);
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [agents, setAgents] = useState<DeliveryAgent[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    if (!user) {
      setLoading(false);
      return;
    }
    const qs = new URLSearchParams();
    if (statusFilter !== 'ALL') qs.set('status', statusFilter);
    if (search.trim()) qs.set('search', search.trim());

    setLoading(true);
    setError(null);
    try {
      const [ordersData, delData] = await Promise.all([
        apiFetch<StaffOrder[]>(`/staff/orders?${qs.toString()}`, { auth: true }),
        apiFetch<{ agents: DeliveryAgent[] }>('/deliveries', { auth: true }).catch(() => ({
          agents: [],
        })),
      ]);
      setOrders(ordersData);
      setAgents(delData.agents);
      if (ordersData.length > 0 && !selectedOrderId) {
        setSelectedOrderId(ordersData[0]!.id);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load orders.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, statusFilter, search]);

  const selected = orders.find((o) => o.id === selectedOrderId) ?? orders[0] ?? null;
  const nextOrderStatuses = selected ? ORDER_TRANSITIONS[selected.status] : [];

  async function transitionOrder(nextStatus: OrderStatusType) {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/staff/orders/${selected.id}/status`, {
        method: 'PATCH',
        auth: true,
        body: JSON.stringify({ status: nextStatus }),
      });
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Status update failed.');
    } finally {
      setBusy(false);
    }
  }

  async function assignAgent(agentId: string) {
    if (!selected?.delivery || !agentId) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/deliveries/${selected.delivery.id}/assign`, {
        method: 'PATCH',
        auth: true,
        body: JSON.stringify({ agentId }),
      });
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Assignment failed.');
    } finally {
      setBusy(false);
    }
  }

  async function reconcileCod(nextStatus: 'COD_COLLECTED' | 'COD_RECONCILED') {
    if (!selected?.payment) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/staff/payments/${selected.payment.id}/status`, {
        method: 'PATCH',
        auth: true,
        body: JSON.stringify({ status: nextStatus }),
      });
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Payment update failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <StaffShell title="Orders">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[28px] font-bold text-ink">Orders &amp; fulfilment</h1>
        <div className="flex flex-wrap gap-2">
          {['ALL', 'CONFIRMED', 'PROCESSING', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED'].map(
            (st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`min-h-[40px] px-3.5 rounded-[10px] border text-[13px] font-semibold transition-colors ${
                  statusFilter === st
                    ? 'bg-brand border-brand text-white'
                    : 'bg-surface border-border-subtle text-ink hover:bg-canvas'
                }`}
              >
                {st === 'ALL' ? 'All' : st.replace(/_/g, ' ')}
              </button>
            ),
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-4 items-start">
        {/* Left order list (Figma 4:1438) */}
        <section className="rounded-[14px] border border-border-subtle bg-surface p-5 flex flex-col gap-4">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order number, phone or customer"
            className="min-h-[44px] w-full rounded-[10px] border border-border-subtle px-4 text-[14px] text-ink outline-none focus:border-brand"
          />

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-canvas text-muted">
                  <th className="py-3 px-3 font-medium">Order</th>
                  <th className="py-3 px-3 font-medium">Customer</th>
                  <th className="py-3 px-3 font-medium">Payment</th>
                  <th className="py-3 px-3 font-medium">Status</th>
                  <th className="py-3 px-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted">
                      Loading orders...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted">
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const active = selected?.id === order.id;
                    return (
                      <tr
                        key={order.id}
                        onClick={() => setSelectedOrderId(order.id)}
                        className={`border-b border-border-subtle cursor-pointer transition-colors ${
                          active ? 'bg-brand-tint' : 'hover:bg-canvas/60'
                        }`}
                      >
                        <td className="py-3.5 px-3 font-semibold text-ink">{order.orderNumber}</td>
                        <td className="py-3.5 px-3 text-ink">{order.customer.fullName}</td>
                        <td className="py-3.5 px-3">
                          <span
                            className={
                              order.payment?.status === 'PAID' ||
                              order.payment?.status === 'COD_RECONCILED'
                                ? 'text-brand font-medium'
                                : 'text-warning font-medium'
                            }
                          >
                            {(order.payment?.status ?? 'PENDING').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-ink">
                          {order.status.replace(/_/g, ' ')}
                        </td>
                        <td className="py-3.5 px-3 font-medium text-ink">
                          {formatEtb(order.grandTotal)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right detail panel */}
        {selected && (
          <aside className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[20px] font-semibold text-ink">{selected.orderNumber}</h2>
              <span className="rounded-full bg-brand-tint px-3 py-1 text-[12px] font-semibold text-brand">
                {selected.status.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="text-[14px] text-muted">
              <p className="font-semibold text-ink">{selected.customer.fullName}</p>
              <p>{selected.customer.phone ?? selected.customer.email}</p>
              {selected.shippingAddress && (
                <p className="mt-1">
                  {selected.shippingAddress.streetAddress}, {selected.shippingAddress.city}
                </p>
              )}
            </div>

            <div className="border-y border-border-subtle py-3 flex flex-col gap-2 text-[14px]">
              {selected.items.map((item) => (
                <div key={item.id} className="flex justify-between gap-2">
                  <span className="text-ink">
                    {item.productNameSnapshot} ({item.variantNameSnapshot}) × {item.quantity}
                  </span>
                  <span className="font-medium text-ink">{formatEtb(item.unitPrice * item.quantity)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-ink pt-1">
                <span>Total ({selected.paymentMethod})</span>
                <span>{formatEtb(selected.grandTotal)}</span>
              </div>
            </div>

            {/* Order Status Transitions */}
            {nextOrderStatuses.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-[13px] font-semibold text-ink">Advance order status</p>
                <div className="flex flex-wrap gap-2">
                  {nextOrderStatuses.map((st) => (
                    <button
                      key={st}
                      type="button"
                      disabled={busy}
                      onClick={() => transitionOrder(st)}
                      className={`min-h-[40px] px-3.5 rounded-[10px] text-[13px] font-semibold transition-colors ${
                        st === 'CANCELLED'
                          ? 'border border-border-subtle bg-surface text-warning hover:bg-warning-tint/40'
                          : 'bg-brand text-white hover:bg-brand-hover'
                      }`}
                    >
                      Mark {st.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* COD Reconciliation */}
            {selected.payment?.status === 'COD_PENDING' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => reconcileCod('COD_COLLECTED')}
                className="min-h-[42px] rounded-[10px] border border-brand text-[13px] font-semibold text-brand hover:bg-brand-tint"
              >
                Record COD cash collected
              </button>
            )}
            {selected.payment?.status === 'COD_COLLECTED' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => reconcileCod('COD_RECONCILED')}
                className="min-h-[42px] rounded-[10px] bg-brand text-[13px] font-semibold text-white"
              >
                Reconcile COD payment
              </button>
            )}

            {/* Delivery Agent Assignment */}
            {selected.delivery && agents.length > 0 && (
              <div className="flex flex-col gap-2 pt-2 border-t border-border-subtle">
                <label className="text-[13px] font-semibold text-ink">
                  Delivery agent ({selected.delivery.status.replace(/_/g, ' ')})
                </label>
                <select
                  value={selected.delivery.assignedAgent?.id ?? ''}
                  onChange={(e) => assignAgent(e.target.value)}
                  disabled={busy}
                  className="min-h-[44px] rounded-[10px] border border-border-subtle bg-surface px-3 text-[14px] text-ink outline-none focus:border-brand"
                >
                  <option value="">Unassigned — select delivery agent</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.fullName} {a.phone ? `(${a.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </aside>
        )}
      </div>
    </StaffShell>
  );
}
