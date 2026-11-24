'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StorefrontHeader } from '@/components/storefront-header';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuthStore, type SessionUser } from '@/lib/auth-store';

export default function SignInPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  const [method, setMethod] = useState<'phone' | 'email'>('phone');
  const [usePassword, setUsePassword] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (method === 'phone' && !usePassword) {
        const res = await apiFetch<{ sent: boolean; target: string; devOtpCode?: string }>(
          '/auth/otp/request',
          {
            method: 'POST',
            body: JSON.stringify({ target: identifier, purpose: 'PHONE_VERIFY' }),
          },
        );
        const params = new URLSearchParams({ target: res.target });
        if (res.devOtpCode) params.set('devCode', res.devOtpCode);
        router.push(`/auth/verify-phone?${params.toString()}`);
        return;
      }

      const data = await apiFetch<{
        accessToken: string;
        refreshToken: string;
        user: SessionUser;
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      });

      setSession(data);
      const isStaff = data.user.roles.some((r) => r !== 'CUSTOMER');
      router.push(isStaff ? '/dashboard' : '/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <StorefrontHeader />

      <main className="max-w-[1440px] w-full mx-auto px-6 lg:px-16 pt-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          {/* Welcome panel (Figma 4:806) */}
          <section className="rounded-[14px] border border-border-subtle bg-brand-tint px-6 lg:px-10 py-12 lg:py-16 flex flex-col gap-4">
            <p className="text-[13px] font-semibold tracking-wide text-brand uppercase">
              YOUR EVERYDAY, MADE EASIER
            </p>
            <h1 className="text-[32px] lg:text-[36px] font-bold leading-[1.35] text-ink">
              A little closer to
              <br />
              something good.
            </h1>
            <p className="text-[16px] leading-[1.45] text-muted max-w-[440px]">
              Sign in to check out, save your favorites and keep track of every order.
            </p>
            <div className="mt-4 w-full max-w-[400px] h-[290px] rounded-[10px] overflow-hidden bg-surface/60">
              <img
                src="/images/woven-tote.png"
                alt="Woven everyday tote"
                className="w-full h-full object-cover"
              />
            </div>
          </section>

          {/* Sign in form (Figma 4:811) */}
          <section className="rounded-[14px] border border-border-subtle bg-surface p-6 lg:p-8 flex flex-col gap-4">
            <h2 className="text-[28px] font-bold text-ink">Welcome back</h2>
            <p className="text-[16px] text-muted">Your cart is saved while you sign in.</p>

            {/* Method switcher */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  setMethod('phone');
                  setError(null);
                }}
                className={`min-h-[48px] px-5 py-3 rounded-[10px] text-[16px] font-semibold border transition-colors ${
                  method === 'phone'
                    ? 'bg-brand border-brand text-white'
                    : 'bg-surface border-border-subtle text-ink hover:bg-canvas'
                }`}
              >
                Phone number
              </button>
              <button
                type="button"
                onClick={() => {
                  setMethod('email');
                  setUsePassword(true);
                  setError(null);
                }}
                className={`min-h-[48px] px-5 py-3 rounded-[10px] text-[16px] font-semibold border transition-colors ${
                  method === 'email'
                    ? 'bg-brand border-brand text-white'
                    : 'bg-surface border-border-subtle text-ink hover:bg-canvas'
                }`}
              >
                Email
              </button>
            </div>

            {error && (
              <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-ink">
                  {method === 'phone' ? 'Phone number' : 'Email address'}
                </label>
                <input
                  type={method === 'email' ? 'email' : 'tel'}
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={method === 'phone' ? '+251 911 234 567' : 'meron@market.et'}
                  className="min-h-[48px] w-full rounded-[10px] border border-border-subtle bg-surface px-4 py-3 text-[16px] text-ink placeholder:text-muted outline-none focus:border-brand"
                />
                {method === 'phone' && (
                  <p className="text-[13px] text-muted">
                    You can also enter a local number starting with 09 or 07.
                  </p>
                )}
              </div>

              {(method === 'email' || usePassword) && (
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-ink">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="min-h-[48px] w-full rounded-[10px] border border-border-subtle bg-surface px-4 py-3 text-[16px] text-ink placeholder:text-muted outline-none focus:border-brand"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="min-h-[48px] w-full rounded-[10px] bg-brand px-5 py-3 text-[16px] font-semibold text-white hover:bg-brand-hover disabled:opacity-60 transition-colors"
              >
                {loading
                  ? 'Please wait...'
                  : method === 'phone' && !usePassword
                    ? 'Send verification code'
                    : 'Sign in'}
              </button>
            </form>

            {method === 'phone' && !usePassword && (
              <p className="text-[13px] text-muted">
                We’ll send you a 6-digit code to verify your number.
              </p>
            )}

            <div className="flex flex-wrap gap-3 pt-1">
              {method === 'phone' && (
                <button
                  type="button"
                  onClick={() => setUsePassword((v) => !v)}
                  className="min-h-[48px] px-5 py-3 rounded-[10px] border border-border-subtle bg-surface text-[16px] font-semibold text-ink hover:bg-canvas transition-colors"
                >
                  {usePassword ? 'Sign in with SMS code' : 'Sign in with password'}
                </button>
              )}
              <Link
                href="/auth/reset-password"
                className="inline-flex items-center min-h-[48px] px-5 py-3 rounded-[10px] border border-border-subtle bg-surface text-[16px] font-semibold text-ink hover:bg-canvas transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <Link
              href="/auth/register"
              className="text-[16px] font-semibold text-brand hover:underline pt-1"
            >
              New here? Create an account
            </Link>

            <p className="text-[13px] text-muted">
              By continuing, you agree to the Terms of service and Privacy policy.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
