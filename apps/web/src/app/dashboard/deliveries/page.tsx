'use client';

import { useEffect, useState } from 'react';
import {
  DELIVERY_TRANSITIONS,
  formatEtb,
  type DeliveryStatusType,
} from '@meskot/shared-types';
import { StaffShell } from '@/components/staff-shell';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface DeliveryRow {
  id: string;
  status: DeliveryStatusType;
  trackingCode: string;
  assignedAgentId: string | null;
  codAmountExpected: number;
  codAmountCollected: number;
  recipientSignedName: string | null;
  order: {
    orderNumber: string;
    paymentMethod: string;
    grandTotal: number;
    shippingAddress: {
      recipientName: string;
      recipientPhone: string;
      streetAddress: string;
      city: string;
    } | null;
  };
}

interface DeliveryAgent {
  id: string;
  fullName: string;
  phone: string | null;
}

export default function DeliveriesWorkspacePage() {
  const user = useAuthStore((s) => s.user);
  const isAgentOnly =
    Boolean(user?.roles.includes('DELIVERY_AGENT')) &&
    !user?.roles.some((r) => ['SUPER_ADMIN', 'ADMIN', 'DELIVERY_MANAGER'].includes(r));

  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [agents, setAgents] = useState<DeliveryAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function loadDeliveries() {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (isAgentOnly) {
        const assigned = await apiFetch<DeliveryRow[]>('/deliveries/assigned', { auth: true });
        setDeliveries(assigned);
      } else {
        const data = await apiFetch<{ deliveries: DeliveryRow[]; agents: DeliveryAgent[] }>(
          '/deliveries',
          { auth: true },
        );
        setDeliveries(data.deliveries);
        setAgents(data.agents);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load deliveries.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDeliveries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleAssign(deliveryId: string, agentId: string) {
    if (!agentId) return;
    setBusyId(deliveryId);
    setError(null);
    try {
      await apiFetch(`/deliveries/${deliveryId}/assign`, {
        method: 'PATCH',
        auth: true,
        body: JSON.stringify({ agentId }),
      });
      await loadDeliveries();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to assign agent.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleTransition(delivery: DeliveryRow, nextStatus: DeliveryStatusType) {
    setBusyId(delivery.id);
    setError(null);
    try {
      await apiFetch(`/deliveries/${delivery.id}/status`, {
        method: 'PATCH',
        auth: true,
        body: JSON.stringify({
          status: nextStatus,
          ...(nextStatus === 'DELIVERED'
            ? {
                recipientSignedName:
                  recipientName[delivery.id] ||
                  delivery.order.shippingAddress?.recipientName ||
                  'Recipient',
                codAmountCollected:
                  delivery.order.paymentMethod === 'COD' ? delivery.codAmountExpected : 0,
              }
            : {}),
        }),
      });
      await loadDeliveries();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Status update failed.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <StaffShell title="Deliveries">
      <div>
        <h1 className="text-[28px] font-bold text-ink">
          {isAgentOnly ? 'My assigned deliveries' : 'Delivery operations'}
        </h1>
        <p className="text-[13px] text-muted mt-1">
          {isAgentOnly
            ? 'Update pickup, transit, proof of delivery, and cash-on-delivery collection.'
            : 'Assign delivery agents and monitor real-time fulfilment progress.'}
        </p>
      </div>

      {error && (
        <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-[14px] border border-border-subtle bg-surface p-8 text-muted">
          Loading deliveries...
        </div>
      ) : deliveries.length === 0 ? (
        <div className="rounded-[14px] border border-border-subtle bg-surface p-8 text-muted">
          No deliveries found.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {deliveries.map((d) => {
            const nextStatuses = DELIVERY_TRANSITIONS[d.status];
            return (
              <section
                key={d.id}
                className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[18px] font-semibold text-ink">
                      {d.order.orderNumber} · {d.trackingCode}
                    </p>
                    <p className="text-[13px] text-muted">
                      {d.order.paymentMethod === 'COD'
                        ? `Collect COD: ${formatEtb(d.codAmountExpected)}`
                        : 'Prepaid online'}
                    </p>
                  </div>
                  <span className="rounded-full bg-brand-tint px-3 py-1 text-[12px] font-semibold text-brand">
                    {d.status.replace(/_/g, ' ')}
                  </span>
                </div>

                {d.order.shippingAddress && (
                  <div className="rounded-[10px] bg-canvas p-3.5 text-[13px] text-muted">
                    <p className="font-semibold text-ink">
                      {d.order.shippingAddress.recipientName} ·{' '}
                      {d.order.shippingAddress.recipientPhone}
                    </p>
                    <p>
                      {d.order.shippingAddress.streetAddress}, {d.order.shippingAddress.city}
                    </p>
                  </div>
                )}

                {!isAgentOnly && agents.length > 0 && (
                  <select
                    value={d.assignedAgentId ?? ''}
                    disabled={busyId === d.id}
                    onChange={(e) => handleAssign(d.id, e.target.value)}
                    className="min-h-[42px] rounded-[10px] border border-border-subtle bg-surface px-3 text-[13px] text-ink outline-none focus:border-brand"
                  >
                    <option value="">Unassigned — assign agent</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.fullName} {a.phone ? `(${a.phone})` : ''}
                      </option>
                    ))}
                  </select>
                )}

                {nextStatuses.includes('DELIVERED') && (
                  <input
                    type="text"
                    value={recipientName[d.id] ?? ''}
                    onChange={(e) =>
                      setRecipientName((prev) => ({ ...prev, [d.id]: e.target.value }))
                    }
                    placeholder="Proof of delivery: recipient name"
                    className="min-h-[42px] rounded-[10px] border border-border-subtle px-3 text-[13px] text-ink outline-none focus:border-brand"
                  />
                )}

                {nextStatuses.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {nextStatuses
                      .filter((st) => st !== 'ASSIGNED' && st !== 'UNASSIGNED')
                      .map((st) => (
                        <button
                          key={st}
                          type="button"
                          disabled={busyId === d.id}
                          onClick={() => handleTransition(d, st)}
                          className={`min-h-[40px] px-3.5 rounded-[10px] text-[13px] font-semibold ${
                            st === 'FAILED_ATTEMPT' || st === 'RETURNED'
                              ? 'border border-border-subtle bg-surface text-warning'
                              : 'bg-brand text-white hover:bg-brand-hover'
                          }`}
                        >
                          Mark {st.replace(/_/g, ' ')}
                        </button>
                      ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </StaffShell>
  );
}
