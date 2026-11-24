'use client';

import { useEffect, useState } from 'react';
import { StaffShell } from '@/components/staff-shell';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

export default function BusinessSettingsPage() {
  const user = useAuthStore((s) => s.user);
  const [reservationTtl, setReservationTtl] = useState('15');
  const [maxCodAttempts, setMaxCodAttempts] = useState('3');
  const [returnWindowDays, setReturnWindowDays] = useState('7');
  const [vatRate, setVatRate] = useState('15');
  const [vatInclusive, setVatInclusive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    apiFetch<Record<string, unknown>>('/settings', { auth: true })
      .then((s) => {
        if (s.stock_reservation_ttl_minutes !== undefined)
          setReservationTtl(String(s.stock_reservation_ttl_minutes));
        if (s.max_cod_delivery_attempts !== undefined)
          setMaxCodAttempts(String(s.max_cod_delivery_attempts));
        if (s.return_window_days !== undefined)
          setReturnWindowDays(String(s.return_window_days));
        if (s.vat_rate_percent !== undefined) setVatRate(String(s.vat_rate_percent));
        if (typeof s.vat_inclusive === 'boolean') setVatInclusive(s.vat_inclusive);
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Unable to load settings.'),
      )
      .finally(() => setLoading(false));
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedMsg(null);
    try {
      await apiFetch('/settings', {
        method: 'PATCH',
        auth: true,
        body: JSON.stringify({
          stock_reservation_ttl_minutes: Number(reservationTtl),
          max_cod_delivery_attempts: Number(maxCodAttempts),
          return_window_days: Number(returnWindowDays),
          vat_rate_percent: Number(vatRate),
          vat_inclusive: vatInclusive,
        }),
      });
      setSavedMsg('Business settings saved and recorded in the audit log.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <StaffShell title="Settings">
      <div>
        <h1 className="text-[28px] font-bold text-ink">Business settings</h1>
        <p className="text-[13px] text-muted mt-1">
          Configure operational business rules (SRS Section 5). Changes are audit-logged.
        </p>
      </div>

      {error && (
        <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
          {error}
        </div>
      )}
      {savedMsg && (
        <div className="rounded-[10px] border border-brand/30 bg-brand-tint px-4 py-3 text-[14px] text-brand font-medium">
          ✓ {savedMsg}
        </div>
      )}

      {loading ? (
        <div className="rounded-[14px] border border-border-subtle bg-surface p-8 text-muted">
          Loading settings...
        </div>
      ) : (
        <form
          onSubmit={handleSave}
          className="max-w-[680px] rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-5"
        >
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-ink">
              Online payment stock reservation window (minutes)
            </label>
            <input
              type="number"
              min={5}
              max={120}
              value={reservationTtl}
              onChange={(e) => setReservationTtl(e.target.value)}
              className="min-h-[48px] rounded-[10px] border border-border-subtle px-4 text-[16px] text-ink outline-none focus:border-brand"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-ink">
              Maximum COD delivery attempts before restocking
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={maxCodAttempts}
              onChange={(e) => setMaxCodAttempts(e.target.value)}
              className="min-h-[48px] rounded-[10px] border border-border-subtle px-4 text-[16px] text-ink outline-none focus:border-brand"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-ink">
              Customer return window (days after delivery)
            </label>
            <input
              type="number"
              min={0}
              max={60}
              value={returnWindowDays}
              onChange={(e) => setReturnWindowDays(e.target.value)}
              className="min-h-[48px] rounded-[10px] border border-border-subtle px-4 text-[16px] text-ink outline-none focus:border-brand"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-ink">VAT rate (%)</label>
              <input
                type="number"
                min={0}
                max={30}
                value={vatRate}
                onChange={(e) => setVatRate(e.target.value)}
                className="min-h-[48px] rounded-[10px] border border-border-subtle px-4 text-[16px] text-ink outline-none focus:border-brand"
              />
            </div>

            <label className="flex items-center gap-2.5 text-[14px] text-ink cursor-pointer pt-5">
              <input
                type="checkbox"
                checked={vatInclusive}
                onChange={(e) => setVatInclusive(e.target.checked)}
                className="accent-brand"
              />
              Catalog prices are VAT-inclusive
            </label>
          </div>

          <div>
            <button
              type="submit"
              disabled={saving}
              className="min-h-[48px] px-6 rounded-[10px] bg-brand text-[15px] font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save business settings'}
            </button>
          </div>
        </form>
      )}
    </StaffShell>
  );
}
