'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StaffShell } from '@/components/staff-shell';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface Warehouse {
  id: string;
  code: string;
  name: string;
}

interface InventoryRow {
  id: string;
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  variantId: string;
  sku: string;
  variantName: string;
  productName: string;
  onHand: number;
  reserved: number;
  available: number;
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

interface InventoryResponse {
  summary: {
    totalUnits: number;
    inStockVariants: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  items: InventoryRow[];
}

export default function InventoryPage() {
  const user = useAuthStore((s) => s.user);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [data, setData] = useState<InventoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    apiFetch<Warehouse[]>('/warehouses', { auth: true })
      .then(setWarehouses)
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const qs = new URLSearchParams();
    if (warehouseId) qs.set('warehouseId', warehouseId);
    if (search.trim()) qs.set('search', search.trim());
    if (status !== 'ALL') qs.set('status', status);

    setLoading(true);
    setError(null);
    apiFetch<InventoryResponse>(`/inventory?${qs.toString()}`, { auth: true })
      .then(setData)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Unable to load inventory.'),
      )
      .finally(() => setLoading(false));
  }, [user, warehouseId, search, status]);

  return (
    <StaffShell title="Inventory">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-ink">Inventory</h1>
          <p className="text-[13px] text-muted mt-1">
            Available quantity = on-hand − reserved across warehouses.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/inventory/adjust"
            className="inline-flex items-center min-h-[48px] px-4 py-3 rounded-[10px] border border-border-subtle bg-surface text-[13px] font-semibold text-ink hover:bg-canvas"
          >
            Adjust stock
          </Link>
          <Link
            href="/dashboard/inventory/receive"
            className="inline-flex items-center min-h-[48px] px-4 py-3 rounded-[10px] bg-brand text-[13px] font-semibold text-white hover:bg-brand-hover"
          >
            Receive stock
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
          {error}
        </div>
      )}

      {/* Inventory summary KPIs (Figma 4:1591) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-3">
          <p className="text-[13px] text-muted">Total units</p>
          <p className="text-[28px] font-bold text-ink">
            {data ? data.summary.totalUnits.toLocaleString() : '—'}
          </p>
        </div>
        <div className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-3">
          <p className="text-[13px] text-muted">In-stock variants</p>
          <p className="text-[28px] font-bold text-ink">
            {data ? data.summary.inStockVariants : '—'}
          </p>
        </div>
        <div className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-3">
          <p className="text-[13px] text-muted">Low stock</p>
          <p className="text-[28px] font-bold text-warning">
            {data ? data.summary.lowStockCount : '—'}
          </p>
        </div>
        <div className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-3">
          <p className="text-[13px] text-muted">Out of stock</p>
          <p className="text-[28px] font-bold text-warning">
            {data ? data.summary.outOfStockCount : '—'}
          </p>
        </div>
      </section>

      {/* Stock levels table (Figma 4:1604) */}
      <section className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-ink">Find a product or SKU</label>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search or scan SKU"
              className="min-h-[48px] rounded-[10px] border border-border-subtle px-4 text-[15px] text-ink outline-none focus:border-brand"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-ink">Warehouse</label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="min-h-[48px] rounded-[10px] border border-border-subtle bg-surface px-4 text-[15px] text-ink outline-none focus:border-brand"
            >
              <option value="">All warehouses</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="min-h-[48px] rounded-[10px] border border-border-subtle bg-surface px-4 text-[13px] font-semibold text-ink outline-none focus:border-brand"
          >
            <option value="ALL">Stock status: All</option>
            <option value="IN_STOCK">In stock</option>
            <option value="LOW_STOCK">Low stock</option>
            <option value="OUT_OF_STOCK">Out of stock</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="bg-canvas text-muted">
                <th className="py-3 px-3 font-medium">Product / variant</th>
                <th className="py-3 px-3 font-medium">SKU</th>
                <th className="py-3 px-3 font-medium">Warehouse</th>
                <th className="py-3 px-3 font-medium">On hand</th>
                <th className="py-3 px-3 font-medium">Reserved</th>
                <th className="py-3 px-3 font-medium">Available</th>
                <th className="py-3 px-3 font-medium">Status</th>
                <th className="py-3 px-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted">
                    Loading inventory...
                  </td>
                </tr>
              ) : !data || data.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted">
                    No inventory items found.
                  </td>
                </tr>
              ) : (
                data.items.map((item) => (
                  <tr key={item.id} className="border-b border-border-subtle">
                    <td className="py-3.5 px-3 text-ink font-medium">
                      {item.productName} · {item.variantName}
                    </td>
                    <td className="py-3.5 px-3 text-ink font-mono text-[12px]">{item.sku}</td>
                    <td className="py-3.5 px-3 text-muted">{item.warehouseCode}</td>
                    <td className="py-3.5 px-3 text-ink">{item.onHand}</td>
                    <td className="py-3.5 px-3 text-ink">{item.reserved}</td>
                    <td className="py-3.5 px-3 font-semibold text-ink">{item.available}</td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          item.stockStatus === 'IN_STOCK'
                            ? 'bg-brand-tint text-brand'
                            : 'bg-warning-tint text-warning'
                        }`}
                      >
                        {item.stockStatus === 'IN_STOCK'
                          ? 'In stock'
                          : item.stockStatus === 'LOW_STOCK'
                            ? 'Low stock'
                            : 'Out of stock'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <Link
                        href={`/dashboard/inventory/adjust?warehouseId=${item.warehouseId}&variantId=${item.variantId}`}
                        className="font-semibold text-brand hover:underline"
                      >
                        Adjust →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </StaffShell>
  );
}
