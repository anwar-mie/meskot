import Link from 'next/link';
import { formatEtb } from '@meskot/shared-types';
import { StaffShell } from '@/components/staff-shell';

export default function DashboardOverviewPage() {
  return (
    <StaffShell title="Sales overview">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-ink">A clear view of your business</h1>
          <p className="text-[13px] text-muted mt-1">All warehouses · ETB</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="min-h-[44px] px-4 rounded-[10px] border border-border-subtle bg-surface text-[13px] font-semibold text-ink"
          >
            Last 7 days ↓
          </button>
          <Link
            href="/dashboard/reports"
            className="inline-flex items-center min-h-[44px] px-4 rounded-[10px] border border-border-subtle bg-surface text-[13px] font-semibold text-ink"
          >
            View reports
          </Link>
        </div>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-3">
          <p className="text-[13px] font-medium text-muted">Revenue</p>
          <p className="text-[24px] font-bold text-ink">{formatEtb(84250)}</p>
          <p className="text-[13px] text-brand">+12.4% vs previous 7 days</p>
        </div>
        <div className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-3">
          <p className="text-[13px] font-medium text-muted">Orders</p>
          <p className="text-[28px] font-bold text-ink">48</p>
          <p className="text-[13px] text-brand">+8 vs previous 7 days</p>
        </div>
        <div className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-3">
          <p className="text-[13px] font-medium text-muted">Awaiting confirmation</p>
          <p className="text-[28px] font-bold text-ink">7</p>
          <p className="text-[13px] text-warning">Needs your attention</p>
        </div>
        <div className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-3">
          <p className="text-[13px] font-medium text-muted">Low-stock variants</p>
          <p className="text-[28px] font-bold text-ink">6</p>
          <p className="text-[13px] text-warning">Across 2 warehouses</p>
        </div>
      </section>
    </StaffShell>
  );
}
