'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatEtb } from '@meskot/shared-types';
import { StaffShell } from '@/components/staff-shell';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface StaffProductRow {
  id: string;
  slug: string;
  nameEn: string;
  status: string;
  isFeatured: boolean;
  category: { nameEn: string };
  variantCount: number;
  minPrice: number;
  totalAvailable: number;
}

export default function StaffProductsPage() {
  const user = useAuthStore((s) => s.user);
  const [products, setProducts] = useState<StaffProductRow[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const qs = new URLSearchParams();
    if (search.trim()) qs.set('search', search.trim());
    if (status !== 'ALL') qs.set('status', status);

    setLoading(true);
    setError(null);
    apiFetch<StaffProductRow[]>(`/staff/products?${qs.toString()}`, { auth: true })
      .then(setProducts)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Unable to load products.'),
      )
      .finally(() => setLoading(false));
  }, [user, search, status]);

  return (
    <StaffShell title="Products">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-ink">Products</h1>
          <p className="text-[13px] text-muted mt-1">
            Manage catalog listings, variants, SKUs, and ETB selling prices.
          </p>
        </div>
        <Link
          href="/dashboard/products/new"
          className="inline-flex items-center min-h-[48px] px-4 py-3 rounded-[10px] bg-brand text-[13px] font-semibold text-white hover:bg-brand-hover transition-colors"
        >
          + Add product
        </Link>
      </div>

      {error && (
        <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name or SKU..."
            className="flex-1 min-w-[220px] min-h-[44px] rounded-[10px] border border-border-subtle px-4 text-[14px] text-ink outline-none focus:border-brand"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="min-h-[44px] rounded-[10px] border border-border-subtle bg-surface px-4 text-[13px] font-semibold text-ink outline-none focus:border-brand"
          >
            <option value="ALL">Status: All</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="UNPUBLISHED">Unpublished</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="bg-canvas text-muted">
                <th className="py-3 px-3 font-medium">Product</th>
                <th className="py-3 px-3 font-medium">Category</th>
                <th className="py-3 px-3 font-medium">Variants</th>
                <th className="py-3 px-3 font-medium">Price (from)</th>
                <th className="py-3 px-3 font-medium">Available</th>
                <th className="py-3 px-3 font-medium">Status</th>
                <th className="py-3 px-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted">
                    Loading products...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted">
                    No products found.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="border-b border-border-subtle">
                    <td className="py-3.5 px-3 font-medium text-ink">
                      {p.nameEn}
                      {p.isFeatured && (
                        <span className="ml-2 rounded-full bg-brand-tint px-2 py-0.5 text-[11px] font-medium text-brand">
                          Featured
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-muted">{p.category.nameEn}</td>
                    <td className="py-3.5 px-3 text-ink">{p.variantCount}</td>
                    <td className="py-3.5 px-3 text-ink font-medium">{formatEtb(p.minPrice)}</td>
                    <td className="py-3.5 px-3 text-ink">{p.totalAvailable}</td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          p.status === 'PUBLISHED'
                            ? 'bg-brand-tint text-brand'
                            : p.status === 'ARCHIVED'
                              ? 'bg-canvas text-muted'
                              : 'bg-warning-tint text-warning'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <Link
                        href={`/dashboard/products/${p.id}`}
                        className="font-semibold text-brand hover:underline"
                      >
                        Edit →
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
