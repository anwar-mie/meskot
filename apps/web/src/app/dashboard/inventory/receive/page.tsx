'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

export default function ReceiveStockPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [quantity, setQuantity] = useState('20');
  const [supplierReference, setSupplierReference] = useState('PO-2026-0174');
  const [reason, setReason] = useState('Supplier delivery received');
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
        if (whs[0]) setWarehouseId(whs[0].id);
        if (inv.items[0]) setVariantId(inv.items[0].variantId);
      })
      .catch(() => {});
  }, [user]);

  const currentItem = useMemo(
    () => items.find((i) => i.warehouseId === warehouseId && i.variantId === variantId) ?? null,
    [items, warehouseId, variantId],
  );

  const uniqueVariants = useMemo(() => {
    const map = new Map<string, InventoryRow>();
    for (const item of items) {
      if (!map.has(item.variantId)) map.set(item.variantId, item);
    }
    return Array.from(map.values());
  }, [items]);

  const qtyNum = Math.max(0, Number(quantity) || 0);
  const beforeOnHand = currentItem?.onHand ?? 0;
  const reserved = currentItem?.reserved ?? 0;
  const afterOnHand = beforeOnHand + qtyNum;
  const beforeAvail = Math.max(0, beforeOnHand - reserved);
  const afterAvail = Math.max(0, afterOnHand - reserved);

  async function handleConfirm() {
    if (!warehouseId || !variantId || qtyNum < 1) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await apiFetch('/inventory/receive', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({
          warehouseId,
          variantId,
          quantity: qtyNum,
          supplierReference: supplierReference.trim() || undefined,
          reason,
          notes: notes.trim() || undefined,
        }),
      });
      setSuccess(`Received +${qtyNum} units. Stock movement and audit log recorded.`);
      setTimeout(() => router.push('/dashboard/inventory'), 1000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to receive stock.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <StaffShell title="Receive stock">
      <div>
        <Link href="/dashboard/inventory" className="text-[13px] font-medium text-brand hover:underline">
          ← Back to inventory
        </Link>
        <h1 className="text-[28px] font-bold text-ink mt-1">Receive stock</h1>
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
              {uniqueVariants.map((v) => (
                <option key={v.variantId} value={v.variantId}>
                  {v.sku} · {v.productName} ({v.variantName})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-ink">Quantity received *</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="min-h-[48px] rounded-[10px] border border-border-subtle px-4 text-[16px] text-ink outline-none focus:border-brand"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-ink">Supplier reference</label>
              <input
                type="text"
                value={supplierReference}
                onChange={(e) => setSupplierReference(e.target.value)}
                placeholder="PO-2026-0174"
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
              <option value="Supplier delivery received">Supplier delivery received</option>
              <option value="Warehouse transfer inbound">Warehouse transfer inbound</option>
              <option value="Initial stock load">Initial stock load</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-ink">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Checked and accepted in good condition."
              className="min-h-[48px] rounded-[10px] border border-border-subtle px-4 text-[15px] text-ink outline-none focus:border-brand"
            />
          </div>
        </section>

        {/* Review stock receipt card (Figma 4:2769) */}
        <aside className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-4">
          <h2 className="text-[20px] font-semibold text-ink">Review stock receipt</h2>
          <div className="text-[15px] text-muted">
            <p className="text-ink font-medium">
              {currentItem ? `${currentItem.productName} · ${currentItem.variantName}` : 'Select SKU'}
            </p>
            <p>
              {currentItem?.sku ?? '—'} ·{' '}
              {warehouses.find((w) => w.id === warehouseId)?.name ?? 'Warehouse'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[14px] border border-border-subtle bg-surface p-5 flex flex-col gap-2">
              <p className="text-[13px] text-muted">Before</p>
              <p className="text-[24px] font-semibold text-ink">{beforeOnHand} units</p>
            </div>
            <div className="rounded-[14px] border border-border-subtle bg-brand-tint p-5 flex flex-col gap-2">
              <p className="text-[13px] text-muted">After</p>
              <p className="text-[24px] font-semibold text-ink">{afterOnHand} units</p>
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

          <p className="text-[16px] font-semibold text-brand">
            +{qtyNum} units · {reason}
          </p>

          <p className="text-[13px] text-muted">
            Recorded as {user?.fullName ?? 'Staff'}. A stock movement with the reference and reason
            is created on confirmation.
          </p>

          <button
            type="button"
            disabled={submitting || qtyNum < 1 || !variantId}
            onClick={handleConfirm}
            className="min-h-[48px] w-full rounded-[10px] bg-brand px-5 py-3 text-[15px] font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {submitting ? 'Confirming...' : 'Confirm stock receipt'}
          </button>
        </aside>
      </div>
    </StaffShell>
  );
}
