'use client';

import { useEffect, useState } from 'react';
import { StaffShell } from '@/components/staff-shell';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface AuditLogRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  actor: { fullName: string; email: string | null } | null;
}

export default function AuditLogPage() {
  const user = useAuthStore((s) => s.user);
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    apiFetch<AuditLogRow[]>('/audit-logs', { auth: true })
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <StaffShell title="Audit log">
      <div>
        <h1 className="text-[28px] font-bold text-ink">Audit log</h1>
        <p className="text-[13px] text-muted mt-1">
          Immutable security, catalog, inventory, order, and role permission trail.
        </p>
      </div>

      <section className="rounded-[14px] border border-border-subtle bg-surface p-6 overflow-x-auto">
        <table className="w-full text-left border-collapse text-[13px]">
          <thead>
            <tr className="bg-canvas text-muted">
              <th className="py-3 px-3 font-medium">Timestamp</th>
              <th className="py-3 px-3 font-medium">Actor</th>
              <th className="py-3 px-3 font-medium">Action</th>
              <th className="py-3 px-3 font-medium">Entity</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-muted">
                  Loading audit logs...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-muted">
                  No audit events recorded yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b border-border-subtle">
                  <td className="py-3 px-3 text-muted whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-ink font-medium">
                    {log.actor?.fullName ?? 'System'}
                  </td>
                  <td className="py-3 px-3 font-mono text-[12px] text-brand">{log.action}</td>
                  <td className="py-3 px-3 text-muted">
                    {log.entityType} · {log.entityId.slice(0, 10)}…
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </StaffShell>
  );
}
