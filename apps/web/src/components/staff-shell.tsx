'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { apiFetch } from '@/lib/api';

const NAV_ITEMS = [
  { label: 'Overview', href: '/dashboard' },
  { label: 'Products', href: '/dashboard/products' },
  { label: 'Inventory', href: '/dashboard/inventory' },
  { label: 'Orders', href: '/dashboard/orders' },
  { label: 'Customers', href: '/dashboard/customers' },
  { label: 'Reports', href: '/dashboard/reports' },
  { label: 'Employees', href: '/dashboard/employees' },
  { label: 'Roles & permissions', href: '/dashboard/roles' },
  { label: 'Delivery zones', href: '/dashboard/delivery-zones' },
  { label: 'Settings', href: '/dashboard/settings' },
  { label: 'Audit log', href: '/dashboard/audit-log' },
];

export function StaffShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, refreshToken, clearSession } = useAuthStore();

  async function handleSignOut() {
    if (refreshToken) {
      try {
        await apiFetch('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // Ignore network errors
      }
    }
    clearSession();
    router.push('/auth/sign-in');
  }

  return (
    <div className="min-h-screen flex bg-canvas">
      <aside className="w-[232px] bg-surface border-r border-border-subtle px-5 py-7 hidden md:flex flex-col gap-1.5 shrink-0">
        <Link href="/" className="text-[28px] font-bold tracking-tight text-brand mb-4">
          market.
        </Link>
        <p className="text-[11px] font-semibold tracking-wider text-muted px-3 mb-2">WORKSPACE</p>
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`px-3 py-2.5 rounded-[10px] text-[13px] transition-colors ${
                isActive
                  ? 'bg-brand-tint text-brand font-semibold'
                  : 'text-muted hover:bg-canvas hover:text-ink'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
        <div className="mt-auto pt-6 px-3 text-[13px] text-muted">Help &amp; support</div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-surface border-b border-border-subtle px-8 py-5 flex items-center justify-between gap-4">
          <p className="text-[16px] font-medium text-muted">{title}</p>
          <div className="flex items-center gap-6 text-[13px]">
            <span className="hidden sm:inline text-muted">English / Amharic</span>
            {user ? (
              <div className="flex items-center gap-3">
                <span className="font-medium text-ink">
                  {user.fullName} · {user.roles[0]?.replace('_', ' ') ?? 'Staff'}
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="text-muted hover:text-ink underline"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link href="/auth/sign-in" className="font-semibold text-brand hover:underline">
                Sign in as staff
              </Link>
            )}
          </div>
        </header>

        <main className="p-8 flex flex-col gap-6 max-w-[1208px] w-full">{children}</main>
      </div>
    </div>
  );
}
