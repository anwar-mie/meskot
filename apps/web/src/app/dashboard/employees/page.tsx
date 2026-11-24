'use client';

import { useEffect, useState } from 'react';
import { StaffShell } from '@/components/staff-shell';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface UserRow {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
  lastLoginAt: string | null;
  roles: Array<{ code: string; name: string }>;
}

const STAFF_ROLE_OPTIONS = [
  { code: 'ADMIN', label: 'Administrator' },
  { code: 'PRODUCT_MANAGER', label: 'Product Manager' },
  { code: 'INVENTORY_MANAGER', label: 'Inventory Manager' },
  { code: 'SALES_MANAGER', label: 'Sales Manager' },
  { code: 'DELIVERY_MANAGER', label: 'Delivery Manager' },
  { code: 'DELIVERY_AGENT', label: 'Delivery Agent' },
];

export default function EmployeesPage() {
  const user = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('Password123!');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['SALES_MANAGER']);
  const [saving, setSaving] = useState(false);

  async function loadUsers() {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<UserRow[]>('/users', { auth: true });
      setUsers(data.filter((u) => u.roles.some((r) => r.code !== 'CUSTOMER')));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load employees.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function toggleRole(code: string) {
    setSelectedRoles((prev) =>
      prev.includes(code) ? prev.filter((r) => r !== code) : [...prev, code],
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (selectedRoles.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/users', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({
          fullName,
          email,
          phone: phone.trim() || undefined,
          password,
          roleCodes: selectedRoles,
        }),
      });
      setShowModal(false);
      setFullName('');
      setEmail('');
      setPhone('');
      await loadUsers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create employee.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(target: UserRow) {
    const nextStatus = target.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await apiFetch(`/users/${target.id}/status`, {
        method: 'PATCH',
        auth: true,
        body: JSON.stringify({ status: nextStatus }),
      });
      await loadUsers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update status.');
    }
  }

  return (
    <StaffShell title="Employees">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-ink">Employees</h1>
          <p className="text-[13px] text-muted mt-1">
            Create staff accounts, assign roles, and suspend or reactivate access.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="min-h-[48px] px-4 py-3 rounded-[10px] bg-brand text-[13px] font-semibold text-white hover:bg-brand-hover"
        >
          + Add employee
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
              <th className="py-3 px-3 font-medium">Employee</th>
              <th className="py-3 px-3 font-medium">Contact</th>
              <th className="py-3 px-3 font-medium">Roles</th>
              <th className="py-3 px-3 font-medium">Status</th>
              <th className="py-3 px-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted">
                  Loading employees...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted">
                  No staff accounts found.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-border-subtle">
                  <td className="py-3.5 px-3 font-medium text-ink">{u.fullName}</td>
                  <td className="py-3.5 px-3 text-muted">
                    {u.email}
                    {u.phone ? ` · ${u.phone}` : ''}
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="flex flex-wrap gap-1.5">
                      {u.roles.map((r) => (
                        <span
                          key={r.code}
                          className="rounded-full bg-brand-tint px-2.5 py-0.5 text-[11px] font-semibold text-brand"
                        >
                          {r.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        u.status === 'ACTIVE'
                          ? 'bg-brand-tint text-brand'
                          : 'bg-warning-tint text-warning'
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-3">
                    {u.id !== user?.id && (
                      <button
                        type="button"
                        onClick={() => toggleStatus(u)}
                        className="font-semibold text-brand hover:underline"
                      >
                        {u.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-[500px] rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-4">
            <h2 className="text-[20px] font-semibold text-ink">Add employee account</h2>
            <form onSubmit={handleCreate} className="flex flex-col gap-3.5">
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name *"
                className="min-h-[44px] rounded-[10px] border border-border-subtle px-3 text-[15px] text-ink outline-none focus:border-brand"
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Work email *"
                className="min-h-[44px] rounded-[10px] border border-border-subtle px-3 text-[15px] text-ink outline-none focus:border-brand"
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone (+2519...)"
                className="min-h-[44px] rounded-[10px] border border-border-subtle px-3 text-[15px] text-ink outline-none focus:border-brand"
              />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Initial password *"
                className="min-h-[44px] rounded-[10px] border border-border-subtle px-3 text-[15px] text-ink outline-none focus:border-brand"
              />
              <div className="flex flex-col gap-1.5">
                <p className="text-[13px] font-medium text-ink">Assign roles *</p>
                <div className="grid grid-cols-2 gap-2">
                  {STAFF_ROLE_OPTIONS.map((role) => (
                    <label
                      key={role.code}
                      className="flex items-center gap-2 text-[13px] text-ink cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes(role.code)}
                        onChange={() => toggleRole(role.code)}
                        className="accent-brand"
                      />
                      {role.label}
                    </label>
                  ))}
                </div>
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
                  disabled={saving || selectedRoles.length === 0}
                  className="min-h-[44px] px-4 rounded-[10px] bg-brand text-[13px] font-semibold text-white disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </StaffShell>
  );
}
