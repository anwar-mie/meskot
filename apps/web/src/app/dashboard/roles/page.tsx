'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { StaffShell } from '@/components/staff-shell';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface RoleRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  employeeCount: number;
  permissions: string[];
}

interface PermissionMatrixRow {
  area: string;
  viewCode: string | null;
  manageCode: string | null;
  sensitiveCode: string | null;
  sensitiveLabel: string;
}

const PERMISSION_MATRIX: PermissionMatrixRow[] = [
  {
    area: 'Orders',
    viewCode: 'orders:read',
    manageCode: 'orders:update',
    sensitiveCode: null,
    sensitiveLabel: 'Cancel',
  },
  {
    area: 'Payments',
    viewCode: 'payments:read',
    manageCode: 'payments:reconcile',
    sensitiveCode: 'payments:reconcile',
    sensitiveLabel: 'Reconcile / Refund',
  },
  {
    area: 'Returns & refunds',
    viewCode: 'returns:manage',
    manageCode: 'returns:manage',
    sensitiveCode: 'returns:manage',
    sensitiveLabel: 'Approve',
  },
  {
    area: 'Customers',
    viewCode: 'customers:read',
    manageCode: 'customers:read',
    sensitiveCode: null,
    sensitiveLabel: 'Export',
  },
  {
    area: 'Products',
    viewCode: 'products:read',
    manageCode: 'products:create',
    sensitiveCode: 'products:update',
    sensitiveLabel: 'Publish / Price',
  },
  {
    area: 'Inventory',
    viewCode: 'inventory:read',
    manageCode: 'inventory:receive',
    sensitiveCode: 'inventory:adjust',
    sensitiveLabel: 'Adjust stock',
  },
  {
    area: 'Deliveries',
    viewCode: 'deliveries:read',
    manageCode: 'deliveries:assign',
    sensitiveCode: 'deliveries:assign',
    sensitiveLabel: 'Assign agent',
  },
  {
    area: 'Employees & roles',
    viewCode: 'users:manage',
    manageCode: 'users:manage',
    sensitiveCode: 'roles:manage',
    sensitiveLabel: 'Change roles',
  },
  {
    area: 'Reports & audit',
    viewCode: 'reports:read',
    manageCode: 'audit:read',
    sensitiveCode: 'settings:manage',
    sensitiveLabel: 'Business settings',
  },
];

export default function RolesPermissionsPage() {
  const user = useAuthStore((s) => s.user);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [draftPermissions, setDraftPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRoleCode, setNewRoleCode] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  async function loadRoles() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<RoleRecord[]>('/roles', { auth: true });
      const staffRoles = data.filter((r) => r.code !== 'CUSTOMER');
      setRoles(staffRoles);
      if (staffRoles.length > 0 && !selectedRoleId) {
        const first = staffRoles.find((r) => r.code === 'SALES_MANAGER') ?? staffRoles[0]!;
        setSelectedRoleId(first.id);
        setDraftPermissions(first.permissions);
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Unable to load roles. Make sure you are signed in as an Admin.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      void loadRoles();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === selectedRoleId) ?? null,
    [roles, selectedRoleId],
  );

  const hasChanges = useMemo(() => {
    if (!selectedRole) return false;
    const a = [...selectedRole.permissions].sort().join(',');
    const b = [...draftPermissions].sort().join(',');
    return a !== b;
  }, [selectedRole, draftPermissions]);

  function selectRole(role: RoleRecord) {
    setSelectedRoleId(role.id);
    setDraftPermissions(role.permissions);
    setSuccessMsg(null);
  }

  function togglePermission(code: string | null) {
    if (!code || selectedRole?.code === 'SUPER_ADMIN') return;
    setDraftPermissions((prev) =>
      prev.includes(code) ? prev.filter((p) => p !== code) : [...prev, code],
    );
    setSuccessMsg(null);
  }

  async function handleSavePermissions() {
    if (!selectedRole) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const updated = await apiFetch<{ id: string; permissions: string[] }>(
        `/roles/${selectedRole.id}/permissions`,
        {
          method: 'PATCH',
          auth: true,
          body: JSON.stringify({ permissionCodes: draftPermissions }),
        },
      );
      setRoles((prev) =>
        prev.map((r) => (r.id === updated.id ? { ...r, permissions: updated.permissions } : r)),
      );
      setDraftPermissions(updated.permissions);
      setSuccessMsg(`Permissions saved for ${selectedRole.name} and recorded in the audit log.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save permissions.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateRole(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const created = await apiFetch<RoleRecord>('/roles', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({
          code: newRoleCode.trim().toUpperCase().replace(/\s+/g, '_'),
          name: newRoleName.trim(),
          description: newRoleDesc.trim() || undefined,
          permissionCodes: [],
        }),
      });
      setRoles((prev) => [...prev, created]);
      setSelectedRoleId(created.id);
      setDraftPermissions(created.permissions);
      setNewRoleCode('');
      setNewRoleName('');
      setNewRoleDesc('');
      setShowAddModal(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create role.');
    }
  }

  return (
    <StaffShell title="Roles & permissions">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-ink">Roles &amp; permissions</h1>
          <p className="text-[13px] text-muted mt-1">
            Give each person the access they need. Nothing more.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          disabled={!user}
          className="min-h-[48px] px-4 py-3 rounded-[10px] bg-brand text-[13px] font-semibold text-white hover:bg-brand-hover disabled:opacity-50 transition-colors"
        >
          Add role
        </button>
      </div>

      {!user && (
        <div className="rounded-[14px] border border-border-subtle bg-surface p-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-[16px] font-semibold text-ink">Sign in required</p>
            <p className="text-[13px] text-muted mt-1">
              Sign in with an Admin account (e.g. meron@market.et / Password123!) to manage staff
              roles and permissions.
            </p>
          </div>
          <Link
            href="/auth/sign-in"
            className="min-h-[44px] inline-flex items-center px-4 rounded-[10px] bg-brand text-[13px] font-semibold text-white shrink-0"
          >
            Sign in
          </Link>
        </div>
      )}

      {error && (
        <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="rounded-[10px] border border-brand/30 bg-brand-tint px-4 py-3 text-[14px] text-brand font-medium">
          ✓ {successMsg}
        </div>
      )}

      {loading ? (
        <div className="rounded-[14px] border border-border-subtle bg-surface p-8 text-[14px] text-muted">
          Loading roles and permissions...
        </div>
      ) : (
        selectedRole && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-[264px_1fr] gap-4 items-start">
              {/* Left role selector */}
              <section className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-3">
                <h2 className="text-[20px] font-semibold text-ink mb-1">Staff roles</h2>
                {roles.map((role) => {
                  const active = role.id === selectedRole.id;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => selectRole(role)}
                      className={`w-full text-left rounded-[14px] border px-4 py-3 flex flex-col gap-1 transition-colors ${
                        active
                          ? 'bg-brand-tint border-brand'
                          : 'bg-surface border-border-subtle hover:bg-canvas'
                      }`}
                    >
                      <span
                        className={`text-[16px] font-semibold ${
                          active ? 'text-brand' : 'text-ink'
                        }`}
                      >
                        {role.name}
                      </span>
                      <span className="text-[13px] text-muted">
                        {role.employeeCount}{' '}
                        {role.employeeCount === 1 ? 'employee' : 'employees'}
                      </span>
                    </button>
                  );
                })}
              </section>

              {/* Right permission matrix */}
              <section className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-[20px] font-semibold text-ink">{selectedRole.name}</h2>
                    <p className="text-[13px] text-muted mt-1">
                      {selectedRole.description ?? 'Custom staff role permissions.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!hasChanges || saving}
                    onClick={handleSavePermissions}
                    className="min-h-[48px] px-4 py-3 rounded-[10px] bg-brand text-[13px] font-semibold text-white hover:bg-brand-hover disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save permissions'}
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[13px]">
                    <thead>
                      <tr className="bg-canvas text-muted">
                        <th className="py-3 px-3 font-medium">Area</th>
                        <th className="py-3 px-3 font-medium">View</th>
                        <th className="py-3 px-3 font-medium">Manage</th>
                        <th className="py-3 px-3 font-medium">Sensitive actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {PERMISSION_MATRIX.map((row) => {
                        const canView = row.viewCode
                          ? draftPermissions.includes(row.viewCode)
                          : false;
                        const canManage = row.manageCode
                          ? draftPermissions.includes(row.manageCode)
                          : false;
                        const canSensitive = row.sensitiveCode
                          ? draftPermissions.includes(row.sensitiveCode)
                          : false;
                        const locked = selectedRole.code === 'SUPER_ADMIN';

                        return (
                          <tr key={row.area} className="border-b border-border-subtle">
                            <td className="py-3.5 px-3 text-ink font-medium">{row.area}</td>
                            <td className="py-3.5 px-3">
                              <button
                                type="button"
                                disabled={locked || !row.viewCode}
                                onClick={() => togglePermission(row.viewCode)}
                                className={`text-left transition-opacity ${
                                  canView ? 'text-brand font-medium' : 'text-ink'
                                } ${locked ? 'opacity-70 cursor-default' : 'hover:underline'}`}
                              >
                                {canView ? '✓ Allowed' : '— Not allowed'}
                              </button>
                            </td>
                            <td className="py-3.5 px-3">
                              <button
                                type="button"
                                disabled={locked || !row.manageCode}
                                onClick={() => togglePermission(row.manageCode)}
                                className={`text-left transition-opacity ${
                                  canManage ? 'text-brand font-medium' : 'text-ink'
                                } ${locked ? 'opacity-70 cursor-default' : 'hover:underline'}`}
                              >
                                {canManage ? '✓ Allowed' : '— Not allowed'}
                              </button>
                            </td>
                            <td className="py-3.5 px-3">
                              {row.sensitiveCode ? (
                                <button
                                  type="button"
                                  disabled={locked}
                                  onClick={() => togglePermission(row.sensitiveCode)}
                                  className={`text-left transition-opacity ${
                                    canSensitive ? 'text-brand font-medium' : 'text-ink'
                                  } ${locked ? 'opacity-70 cursor-default' : 'hover:underline'}`}
                                >
                                  {canSensitive
                                    ? `✓ ${row.sensitiveLabel}`
                                    : `— ${row.sensitiveLabel}`}
                                </button>
                              ) : (
                                <span className="text-muted">— {row.sensitiveLabel}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <p className="text-[13px] text-muted">
                  Click any permission cell above to toggle access. Super Administrator retains full
                  access.
                </p>
              </section>
            </div>

            {/* Amber confirmation banner (Figma 4:2046) */}
            {hasChanges && (
              <section className="rounded-[14px] border border-border-subtle bg-warning-tint p-6 flex flex-col gap-3">
                <h3 className="text-[20px] font-semibold text-warning">
                  Review permission changes before saving
                </h3>
                <p className="text-[16px] text-warning">
                  You are changing access for {selectedRole.employeeCount}{' '}
                  {selectedRole.employeeCount === 1 ? 'employee' : 'employees'}. Saving requires
                  confirmation and adds an audit entry. Existing permissions stay in place until
                  confirmed.
                </p>
                <div className="flex flex-wrap gap-3 pt-1">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleSavePermissions}
                    className="min-h-[48px] px-4 py-3 rounded-[10px] border border-border-subtle bg-surface text-[13px] font-semibold text-ink hover:bg-canvas"
                  >
                    {saving ? 'Confirming...' : 'Confirm & save changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftPermissions(selectedRole.permissions)}
                    className="min-h-[48px] px-4 py-3 rounded-[10px] border border-border-subtle bg-surface text-[13px] font-semibold text-ink hover:bg-canvas"
                  >
                    Discard changes
                  </button>
                </div>
              </section>
            )}
          </>
        )
      )}

      {/* Create Role Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-[480px] rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-4">
            <h2 className="text-[20px] font-semibold text-ink">Create custom role</h2>
            <form onSubmit={handleCreateRole} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-ink">Role name *</label>
                <input
                  type="text"
                  required
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="Customer Support"
                  className="min-h-[44px] rounded-[10px] border border-border-subtle px-3 text-[15px] text-ink outline-none focus:border-brand"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-ink">Role code *</label>
                <input
                  type="text"
                  required
                  value={newRoleCode}
                  onChange={(e) => setNewRoleCode(e.target.value)}
                  placeholder="CUSTOMER_SUPPORT"
                  className="min-h-[44px] rounded-[10px] border border-border-subtle px-3 text-[15px] text-ink outline-none focus:border-brand"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-ink">Description</label>
                <input
                  type="text"
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Can view orders and assist customers."
                  className="min-h-[44px] rounded-[10px] border border-border-subtle px-3 text-[15px] text-ink outline-none focus:border-brand"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="min-h-[44px] px-4 rounded-[10px] border border-border-subtle text-[13px] font-semibold text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-4 rounded-[10px] bg-brand text-[13px] font-semibold text-white"
                >
                  Create role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </StaffShell>
  );
}
