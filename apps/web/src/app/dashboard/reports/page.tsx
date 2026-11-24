'use client';

import { useEffect, useState } from 'react';
import { formatEtb } from '@meskot/shared-types';
import { StaffShell } from '@/components/staff-shell';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface SalesReport {
  paidRevenue: number;
  ordersPlaced: number;
  paidOrdersCount: number;
  unpaidCount: number;
  averagePaidOrder: number;
  refundsIssued: number;
  refundedCount: number;
  dailyRevenue: Array<{ date: string; label: string; amount: number }>;
  byPaymentMethod: { online: number; cod: number };
}

export default function ReportsPage() {
  const user = useAuthStore((s) => s.user);
  const [report, setReport] = useState<SalesReport | null>(null);

  useEffect(() => {
    if (!user) return;
    apiFetch<SalesReport>('/reports/sales', { auth: true })
      .then(setReport)
      .catch(() => {});
  }, [user]);

  const maxDaily = report
    ? Math.max(1, ...report.dailyRevenue.map((d) => d.amount))
    : 1;

  function exportCsv() {
    if (!report) return;
    const rows = [
      ['Date', 'Paid Revenue (ETB)'],
      ...report.dailyRevenue.map((d) => [d.date, String(d.amount)]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'market-sales-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <StaffShell title="Reports">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-ink">Reports</h1>
          <p className="text-[13px] text-muted mt-1">
            Understand sales, stock and customer activity.
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={!report}
          className="min-h-[48px] px-4 py-3 rounded-[10px] bg-brand text-[13px] font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
        >
          Export report (CSV)
        </button>
      </div>

      {/* Report metrics (Figma 4:2071) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-2">
          <p className="text-[13px] text-muted">Paid revenue</p>
          <p className="text-[24px] font-bold text-ink">
            {report ? formatEtb(report.paidRevenue) : '—'}
          </p>
          <p className="text-[13px] text-muted">Excludes pending payments</p>
        </div>
        <div className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-2">
          <p className="text-[13px] text-muted">Orders placed</p>
          <p className="text-[24px] font-bold text-ink">{report ? report.ordersPlaced : '—'}</p>
          <p className="text-[13px] text-muted">
            {report ? `${report.unpaidCount} unpaid / COD pending` : '—'}
          </p>
        </div>
        <div className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-2">
          <p className="text-[13px] text-muted">Average paid order</p>
          <p className="text-[24px] font-bold text-ink">
            {report ? formatEtb(report.averagePaidOrder) : '—'}
          </p>
          <p className="text-[13px] text-muted">
            {report ? `${report.paidOrdersCount} paid orders` : '—'}
          </p>
        </div>
        <div className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-2">
          <p className="text-[13px] text-muted">Refunds issued</p>
          <p className="text-[24px] font-bold text-ink">
            {report ? formatEtb(report.refundsIssued) : '—'}
          </p>
          <p className="text-[13px] text-muted">
            {report ? `${report.refundedCount} refunded orders` : '—'}
          </p>
        </div>
      </section>

      {/* Daily revenue chart & payment breakdown */}
      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 items-start">
          <section className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-[20px] font-semibold text-ink">Paid revenue by day</h2>
              <p className="text-[13px] text-muted">ETB · Last 7 days</p>
            </div>
            <div className="grid grid-cols-7 gap-3 items-end h-[180px] pt-4">
              {report.dailyRevenue.map((day) => {
                const heightPct = Math.max(8, Math.round((day.amount / maxDaily) * 100));
                return (
                  <div key={day.date} className="flex flex-col items-center gap-2 h-full justify-end">
                    <div
                      title={`${day.label}: ${formatEtb(day.amount)}`}
                      style={{ height: `${heightPct}%` }}
                      className="w-full max-w-[58px] rounded-[5px] bg-[#bbd8cc] hover:bg-brand transition-colors"
                    />
                    <span className="text-[11px] text-muted whitespace-nowrap">{day.label}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-4">
            <h2 className="text-[20px] font-semibold text-ink">Payment methods</h2>
            <div className="flex justify-between text-[15px]">
              <span className="text-muted">Online (Chapa / Sandbox)</span>
              <span className="font-semibold text-ink">{report.byPaymentMethod.online}</span>
            </div>
            <div className="flex justify-between text-[15px]">
              <span className="text-muted">Cash on delivery</span>
              <span className="font-semibold text-ink">{report.byPaymentMethod.cod}</span>
            </div>
          </section>
        </div>
      )}
    </StaffShell>
  );
}
