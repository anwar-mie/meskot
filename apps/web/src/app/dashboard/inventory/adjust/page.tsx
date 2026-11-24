'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { StaffShell } from '@/components/staff-shell';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface Warehouse {
  id: string;
  name: string;
}

interface InventoryRow {
  warehouseId: string;
  warehouseName: string;
  variantId: string;
  sku: string;
  variantName: string;
  productName: string;
  onHand: number;
  reserved: number;
  available: number;
}

function AdjustStockContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [warehouseId, setWarehouseId] = useState(searchParams.get('warehouseId') ?? '');
  const [variantId, setVariantId] = useState(searchParams.get('variantId') ?? '');
  const [direction, setDirection] = useState<'REMOVE' | 'ADD'>('REMOVE');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('Damaged during handling');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      apiFetch<Warehouse[]>('/warehouses', { auth: true }),
      apiFetch<{ items: InventoryRow[] }>('/inventory', { auth: true }),
    ])
      .then(([whs, inv]) => {
        setWarehouses(whs);
        setItems(inv.items);
        if (!warehouseId && whs[0]) setWarehouseId(whs[0].id);
        if (!variantId && inv.items[0]) setVariantId(inv.items[0].variantId);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const currentItem = useMemo(
    () => items.find((i) => i.warehouseId === warehouseId && i.variantId === variantId) ?? null,
    [items, warehouseId, variantId],
  );

  const qtyNum = Math.max(0, Number(quantity) || 0);
  const delta = direction === 'ADD' ? qtyNum : -qtyNum;
  const beforeOnHand = currentItem?.onHand ?? 0;
  const reserved = currentItem?.reserved ?? 0;
  const afterOnHand = beforeOnHand + delta;
  const beforeAvail = Math.max(0, beforeOnHand - reserved);
  const afterAvail = Math.max(0, afterOnHand - reserved);
  const invalidBelowReserved = afterOnHand < reserved;

  async function handleConfirm() {
    if (!warehouseId || !variantId || qtyNum < 1 || invalidBelowReserved) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await apiFetch('/inventory/adjustments', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({
          warehouseId,
          variantId,
          direction,
          quantity: qtyNum,
          reason,
          notes: notes.trim() || undefined,
        }),
      });
      setSuccess('Stock adjustment saved to the movement ledger and audit log.');
      setTimeout(() => router.push('/dashboard/inventory'), 1000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save adjustment.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <StaffShell title="Stock adjustment">
      <div>
        <Link href="/dashboard/inventory" className="text-[13px] font-medium text-brand hover:underline">
          ← Back to inventory
        </Link>
        <h1 className="text-[28px] font-bold text-ink mt-1">Stock adjustment</h1>
      </div>

      {error && (
        <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-[10px] border border-brand/30 bg-brand-tint px-4 py-3 text-[14px] text-brand font-medium">
          ✓ {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_456px] gap-4 items-start">
        <section className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-ink">Warehouse *</label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="min-h-[48px] rounded-[10px] border border-border-subtle bg-surface px-4 text-[15px] text-ink outline-none focus:border-brand"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-ink">Product or SKU *</label>
            <select
              value={variantId}
              onChange={(e) => setVariantId(e.target.value)}
              className="min-h-[48px] rounded-[10px] border border-border-subtle bg-surface px-4 text-[15px] text-ink outline-none focus:border-brand"
            >
              {items
                .filter((i) => !warehouseId || i.warehouseId === warehouseId)
                .map((v) => (
                  <option key={v.variantId} value={v.variantId}>
                    {v.sku} · {v.productName} ({v.variantName})
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-[14px] border border-border-subtle bg-surface p-4 flex flex-col gap-1">
              <p className="text-[13px] text-muted">On hand</p>
              <p className="text-[24px] font-semibold text-ink">{beforeOnHand}</p>
            </div>
            <div className="rounded-[14px] border border-border-subtle bg-surface p-4 flex flex-col gap-1">
              <p className="text-[13px] text-muted">Reserved</p>
              <p className="text-[24px] font-semibold text-ink">{reserved}</p>
            </div>
            <div className="rounded-[14px] border border-border-subtle bg-surface p-4 flex flex-col gap-1">
              <p className="text-[13px] text-muted">Available</p>
              <p className="text-[24px] font-semibold text-ink">{beforeAvail}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-ink">Adjustment *</label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as 'REMOVE' | 'ADD')}
                className="min-h-[48px] rounded-[10px] border border-border-subtle bg-surface px-4 text-[15px] text-ink outline-none focus:border-brand"
              >
                <option value="REMOVE">Remove units</option>
                <option value="ADD">Add units</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-ink">Quantity *</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="min-h-[48px] rounded-[10px] border border-border-subtle px-4 text-[16px] text-ink outline-none focus:border-brand"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-ink">Reason *</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[48px] rounded-[10px] border border-border-subtle bg-surface px-4 text-[15px] text-ink outline-none focus:border-brand"
            >
              <option value="Damaged during handling">Damaged during handling</option>
              <option value="Stocktake count reconciliation">Stocktake count reconciliation</option>
              <option value="Lost or missing inventory">Lost or missing inventory</option>
              <option value="Found during audit">Found during audit</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-ink">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional context for audit log..."
              className="min-h-[48px] rounded-[10px] border border-border-subtle px-4 text-[15px] text-ink outline-none focus:border-brand"
            />
          </div>
        </section>

        {/* Review adjustment card (Figma 4:1810) */}
        <aside className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-4">
          <span className="self-start rounded-full bg-warning-tint px-3 py-1 text-[13px] font-medium text-warning">
            Review before confirming
          </span>
          <h2 className="text-[28px] font-bold text-ink">
            {direction === 'REMOVE' ? `Remove ${qtyNum} units?` : `Add ${qtyNum} units?`}
          </h2>
          <div className="text-[15px] text-muted">
            <p className="text-ink font-medium">{currentItem?.productName ?? 'Select SKU'}</p>
            <p>
              {currentItem?.sku ?? '—'} · {currentItem?.warehouseName ?? 'Warehouse'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[14px] border border-border-subtle bg-surface p-5 flex flex-col gap-2">
              <p className="text-[13px] text-muted">Before</p>
              <p className="text-[24px] font-semibold text-ink">{beforeOnHand} units</p>
            </div>
            <div className="rounded-[14px] border border-border-subtle bg-brand-tint p-5 flex flex-col gap-2 text-brand">
              <p className="text-[13px]">After</p>
              <p className="text-[24px] font-semibold">{afterOnHand} units</p>
            </div>
          </div>

          <div className="text-[15px] text-muted">
            <p>
              Reserved: {reserved} → {reserved}
            </p>
            <p>
              Available: {beforeAvail} → {afterAvail}
            </p>
          </div>

          {invalidBelowReserved && (
            <p className="text-[13px] text-red-700 font-medium">
              Cannot reduce on-hand stock below reserved quantity ({reserved}).
            </p>
          )}

          <p className="text-[15px] font-medium text-ink">Reason: {reason}</p>
          <p className="text-[13px] text-muted">
            This adjustment will be saved to the stock movement audit trail as{' '}
            {user?.fullName ?? 'Staff'}.
          </p>

          <button
            type="button"
            disabled={submitting || qtyNum < 1 || !currentItem || invalidBelowReserved}
            onClick={handleConfirm}
            className="min-h-[48px] w-full rounded-[10px] bg-brand px-5 py-3 text-[13px] font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {submitting ? 'Confirming...' : 'Confirm stock adjustment'}
          </button>
        </aside>
      </div>
    </StaffShell>
  );
}

export default function AdjustStockPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <AdjustStockContent />
    </Suspense>
  );
}
