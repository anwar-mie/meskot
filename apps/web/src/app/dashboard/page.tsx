'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatEtb } from '@meskot/shared-types';
import { StaffShell } from '@/components/staff-shell';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface OverviewReport {
  paidRevenue: number;
  totalGrossSales: number;
  ordersPlaced: number;
  paidOrdersCount: number;
  unpaidCount: number;
  awaitingConfirmation: number;
  lowStockVariants: number;
}

export default function DashboardOverviewPage() {
  const user = useAuthStore((s) => s.user);
  const [report, setReport] = useState<OverviewReport | null>(null);

  useEffect(() => {
    if (!user) return;
    apiFetch<OverviewReport>('/reports/sales', { auth: true })
      .then(setReport)
      .catch(() => {});
  }, [user]);

  return (
    <StaffShell title="Sales overview">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-ink">A clear view of your business</h1>
          <p className="text-[13px] text-muted mt-1">All warehouses · ETB · Live metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/orders"
            className="inline-flex items-center min-h-[44px] px-4 rounded-[10px] border border-border-subtle bg-surface text-[13px] font-semibold text-ink hover:bg-canvas"
          >
            Manage orders
          </Link>
          <Link
            href="/dashboard/reports"
            className="inline-flex items-center min-h-[44px] px-4 rounded-[10px] bg-brand text-[13px] font-semibold text-white hover:bg-brand-hover"
          >
            View reports
          </Link>
        </div>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-3">
          <p className="text-[13px] font-medium text-muted">Paid revenue</p>
          <p className="text-[24px] font-bold text-ink">
            {report ? formatEtb(report.paidRevenue) : '—'}
          </p>
          <p className="text-[13px] text-brand">
            {report ? `${report.paidOrdersCount} paid order(s)` : 'Sign in as staff'}
          </p>
        </div>
        <div className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-3">
          <p className="text-[13px] font-medium text-muted">Orders placed</p>
          <p className="text-[28px] font-bold text-ink">{report ? report.ordersPlaced : '—'}</p>
          <p className="text-[13px] text-muted">
            {report ? `${report.unpaidCount} pending / COD` : 'All statuses'}
          </p>
        </div>
        <div className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-3">
          <p className="text-[13px] font-medium text-muted">Awaiting confirmation</p>
          <p className="text-[28px] font-bold text-ink">
            {report ? report.awaitingConfirmation : '—'}
          </p>
          <p className="text-[13px] text-warning">Needs your attention</p>
        </div>
        <div className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-3">
          <p className="text-[13px] font-medium text-muted">Low-stock variants</p>
          <p className="text-[28px] font-bold text-ink">
            {report ? report.lowStockVariants : '—'}
          </p>
          <Link href="/dashboard/inventory" className="text-[13px] text-warning hover:underline">
            Review inventory →
          </Link>
        </div>
      </section>
    </StaffShell>
  );
}
