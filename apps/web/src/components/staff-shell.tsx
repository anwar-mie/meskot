'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { apiFetch } from '@/lib/api';
import { useTranslations, type Locale, type TranslationKey } from '@/lib/i18n';

const NAV_ITEMS: Array<{ key: TranslationKey; href: string }> = [
  { key: 'navOverview', href: '/dashboard' },
  { key: 'navProducts', href: '/dashboard/products' },
  { key: 'navInventory', href: '/dashboard/inventory' },
  { key: 'navOrders', href: '/dashboard/orders' },
  { key: 'navDeliveries', href: '/dashboard/deliveries' },
  { key: 'navCustomers', href: '/dashboard/customers' },
  { key: 'navReports', href: '/dashboard/reports' },
  { key: 'navEmployees', href: '/dashboard/employees' },
  { key: 'navRoles', href: '/dashboard/roles' },
  { key: 'navDeliveryZones', href: '/dashboard/delivery-zones' },
  { key: 'navSettings', href: '/dashboard/settings' },
  { key: 'navAuditLog', href: '/dashboard/audit-log' },
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
  const { locale, setLocale, t } = useTranslations();

  function switchLocale(next: Locale) {
    setLocale(next);
    if (user) {
      apiFetch('/auth/locale', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({ locale: next }),
      }).catch(() => {});
    }
  }

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
        <p className="text-[11px] font-semibold tracking-wider text-muted px-3 mb-2">
          {t('workspace')}
        </p>
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`px-3 py-2.5 rounded-[10px] text-[13px] transition-colors ${
                isActive
                  ? 'bg-brand-tint text-brand font-semibold'
                  : 'text-muted hover:bg-canvas hover:text-ink'
              }`}
            >
              {t(item.key)}
            </Link>
          );
        })}
        <div className="mt-auto pt-6 px-3 text-[13px] text-muted">{t('helpSupport')}</div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-surface border-b border-border-subtle px-8 py-5 flex items-center justify-between gap-4">
          <p className="text-[16px] font-medium text-muted">{title}</p>
          <div className="flex items-center gap-6 text-[13px]">
            <div className="hidden sm:flex items-center gap-2 text-muted">
              <button
                type="button"
                onClick={() => switchLocale('en')}
                className={locale === 'en' ? 'font-semibold text-brand' : 'hover:text-ink'}
              >
                English
              </button>
              <span>/</span>
              <button
                type="button"
                onClick={() => switchLocale('am')}
                className={locale === 'am' ? 'font-semibold text-brand' : 'hover:text-ink'}
              >
                አማርኛ
              </button>
            </div>
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
                  {t('signOut')}
                </button>
              </div>
            ) : (
              <Link href="/auth/sign-in" className="font-semibold text-brand hover:underline">
                {t('signIn')}
              </Link>
            )}
          </div>
        </header>

        <main className="p-8 flex flex-col gap-6 max-w-[1208px] w-full">{children}</main>
      </div>
    </div>
  );
}
