'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { apiFetch } from '@/lib/api';
import { useTranslations, type Locale } from '@/lib/i18n';

export function StorefrontHeader({ cartCount = 0 }: { cartCount?: number }) {
  const router = useRouter();
  const { user, refreshToken, clearSession, isStaff } = useAuthStore();
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
        // Ignore network errors during logout
      }
    }
    clearSession();
    router.push('/');
  }

  return (
    <header className="bg-surface w-full">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-16 py-5 flex items-center gap-6">
        <Link href="/" className="text-[28px] font-bold tracking-tight text-brand shrink-0">
          market.
        </Link>

        <div className="flex-1">
          <input
            type="search"
            placeholder={t('searchPlaceholder')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const value = (e.target as HTMLInputElement).value.trim();
                router.push(value ? `/shop?search=${encodeURIComponent(value)}` : '/shop');
              }
            }}
            className="w-full min-h-[48px] rounded-[10px] bg-canvas px-4 py-3 text-[16px] text-ink placeholder:text-muted outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>

        <div className="hidden md:flex items-center gap-2 text-[13px] text-muted shrink-0">
          <button
            type="button"
            onClick={() => switchLocale('en')}
            className={
              locale === 'en' ? 'font-semibold text-brand' : 'hover:text-ink transition-colors'
            }
          >
            English
          </button>
          <span>/</span>
          <button
            type="button"
            onClick={() => switchLocale('am')}
            className={
              locale === 'am' ? 'font-semibold text-brand' : 'hover:text-ink transition-colors'
            }
          >
            አማርኛ
          </button>
        </div>

        {user ? (
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            {isStaff() && (
              <Link
                href="/dashboard"
                className="inline-flex items-center min-h-[48px] px-4 py-3 rounded-[10px] bg-brand-tint text-[14px] font-semibold text-brand hover:opacity-90 transition-opacity"
              >
                {t('staffWorkspace')}
              </Link>
            )}
            <Link
              href="/account"
              className="inline-flex items-center min-h-[48px] px-5 py-3 rounded-[10px] border border-border-subtle bg-surface text-[15px] font-medium text-ink hover:bg-canvas transition-colors"
            >
              {user.fullName.split(' ')[0]}
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-[13px] font-medium text-muted hover:text-ink px-2"
            >
              {t('signOut')}
            </button>
          </div>
        ) : (
          <Link
            href="/auth/sign-in"
            className="hidden sm:inline-flex items-center min-h-[48px] px-5 py-3 rounded-[10px] border border-border-subtle bg-surface text-[16px] font-medium text-ink hover:bg-canvas transition-colors shrink-0"
          >
            {t('signIn')}
          </Link>
        )}

        <Link
          href="/cart"
          className="inline-flex items-center min-h-[48px] px-5 py-3 rounded-[10px] bg-brand text-[16px] font-medium text-white hover:bg-brand-hover transition-colors shrink-0"
        >
          {t('cart')} ({cartCount})
        </Link>
      </div>

      <nav className="border-y border-border-subtle">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-16 py-3 flex items-center gap-6 text-[13px] overflow-x-auto">
          <Link href="/shop" className="font-semibold text-brand shrink-0">
            {t('allCategories')}
          </Link>
          <Link href="/shop?category=home-living" className="text-muted hover:text-ink shrink-0">
            {t('homeLiving')}
          </Link>
          <Link href="/shop?category=electronics" className="text-muted hover:text-ink shrink-0">
            {t('electronics')}
          </Link>
          <Link
            href="/shop?category=fashion-accessories"
            className="text-muted hover:text-ink shrink-0"
          >
            {t('fashion')}
          </Link>
          <Link href="/shop?category=beauty-care" className="text-muted hover:text-ink shrink-0">
            {t('beauty')}
          </Link>
          <Link href="/shop?sort=newest" className="text-muted hover:text-ink shrink-0">
            {t('newArrivals')}
          </Link>
          <Link href="/shop?offers=true" className="text-muted hover:text-ink shrink-0">
            {t('offers')}
          </Link>
        </div>
      </nav>
    </header>
  );
}
