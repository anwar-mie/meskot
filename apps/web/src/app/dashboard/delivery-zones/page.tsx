'use client';

import { useEffect, useState } from 'react';
import { formatEtb } from '@meskot/shared-types';
import { StaffShell } from '@/components/staff-shell';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface DeliveryZone {
  id: string;
  name: string;
  city: string;
  fee: number;
  freeDeliveryThreshold: number | null;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  isActive: boolean;
}

export default function DeliveryZonesPage() {
  const user = useAuthStore((s) => s.user);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [name, setName] = useState('');
  const [city, setCity] = useState('Addis Ababa');
  const [fee, setFee] = useState('150');
  const [freeThreshold, setFreeThreshold] = useState('5000');
  const [saving, setSaving] = useState(false);

  async function loadZones() {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<DeliveryZone[]>('/staff/delivery-zones', { auth: true });
      setZones(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load delivery zones.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadZones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/staff/delivery-zones', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({
          name: name.trim(),
          city: city.trim(),
          fee: Number(fee),
          freeDeliveryThreshold: freeThreshold ? Number(freeThreshold) : null,
        }),
      });
      setShowModal(false);
      setName('');
      await loadZones();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create zone.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(zone: DeliveryZone) {
    try {
      await apiFetch(`/staff/delivery-zones/${zone.id}`, {
        method: 'PATCH',
        auth: true,
        body: JSON.stringify({ isActive: !zone.isActive }),
      });
      await loadZones();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update zone.');
    }
  }

  return (
    <StaffShell title="Delivery zones">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-ink">Delivery zones</h1>
          <p className="text-[13px] text-muted mt-1">
            Configure delivery fees, free-delivery thresholds, and estimated delivery windows.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="min-h-[48px] px-4 py-3 rounded-[10px] bg-brand text-[13px] font-semibold text-white hover:bg-brand-hover"
        >
          + Add delivery zone
        </button>
      </div>

      {error && (
        <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-[14px] border border-border-subtle bg-surface p-6 overflow-x-auto">
        <table className="w-full text-left border-collapse text-[13px]">
          <thead>
            <tr className="bg-canvas text-muted">
              <th className="py-3 px-3 font-medium">Zone name</th>
              <th className="py-3 px-3 font-medium">City / Region</th>
              <th className="py-3 px-3 font-medium">Delivery fee</th>
              <th className="py-3 px-3 font-medium">Free threshold</th>
              <th className="py-3 px-3 font-medium">Est. days</th>
              <th className="py-3 px-3 font-medium">Status</th>
              <th className="py-3 px-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted">
                  Loading zones...
                </td>
              </tr>
            ) : (
              zones.map((z) => (
                <tr key={z.id} className="border-b border-border-subtle">
                  <td className="py-3.5 px-3 font-medium text-ink">{z.name}</td>
                  <td className="py-3.5 px-3 text-muted">{z.city}</td>
                  <td className="py-3.5 px-3 font-medium text-ink">{formatEtb(z.fee)}</td>
                  <td className="py-3.5 px-3 text-muted">
                    {z.freeDeliveryThreshold ? formatEtb(z.freeDeliveryThreshold) : 'None'}
                  </td>
                  <td className="py-3.5 px-3 text-muted">
                    {z.estimatedDaysMin}–{z.estimatedDaysMax} days
                  </td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        z.isActive ? 'bg-brand-tint text-brand' : 'bg-canvas text-muted'
                      }`}
                    >
                      {z.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="py-3.5 px-3">
                    <button
                      type="button"
                      onClick={() => toggleActive(z)}
                      className="font-semibold text-brand hover:underline"
                    >
                      {z.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-[480px] rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-4">
            <h2 className="text-[20px] font-semibold text-ink">Add delivery zone</h2>
            <form onSubmit={handleCreate} className="flex flex-col gap-3.5">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Zone name (e.g. Addis Ababa - Lideta) *"
                className="min-h-[44px] rounded-[10px] border border-border-subtle px-3 text-[15px] text-ink outline-none focus:border-brand"
              />
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City / Region *"
                className="min-h-[44px] rounded-[10px] border border-border-subtle px-3 text-[15px] text-ink outline-none focus:border-brand"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  min={0}
                  required
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  placeholder="Fee (ETB) *"
                  className="min-h-[44px] rounded-[10px] border border-border-subtle px-3 text-[15px] text-ink outline-none focus:border-brand"
                />
                <input
                  type="number"
                  min={0}
                  value={freeThreshold}
                  onChange={(e) => setFreeThreshold(e.target.value)}
                  placeholder="Free above (ETB)"
                  className="min-h-[44px] rounded-[10px] border border-border-subtle px-3 text-[15px] text-ink outline-none focus:border-brand"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="min-h-[44px] px-4 rounded-[10px] border border-border-subtle text-[13px] font-semibold text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-[44px] px-4 rounded-[10px] bg-brand text-[13px] font-semibold text-white"
                >
                  {saving ? 'Saving...' : 'Create zone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </StaffShell>
  );
}
