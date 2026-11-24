'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StorefrontHeader } from '@/components/storefront-header';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuthStore, type SessionUser } from '@/lib/auth-store';

export default function RegisterPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const payload =
        method === 'email'
          ? { fullName, email, password }
          : { fullName, phone, password };

      const data = await apiFetch<{
        accessToken: string;
        refreshToken: string;
        user: SessionUser;
      }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setSession(data);
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create account.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <StorefrontHeader />

      <main className="max-w-[1440px] w-full mx-auto px-6 lg:px-16 pt-8 pb-16 flex justify-center">
        <div className="w-full max-w-[640px] rounded-[14px] border border-border-subtle bg-surface p-6 lg:p-8 flex flex-col gap-4">
          <h1 className="text-[28px] font-bold text-ink">Create your account</h1>
          <p className="text-[16px] text-muted">
            Keep your cart, save your favorites and follow your orders.
          </p>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                setMethod('email');
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
          </div>

          {error && (
            <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-ink">Full name *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Selam Abebe"
                className="min-h-[48px] w-full rounded-[10px] border border-border-subtle bg-surface px-4 py-3 text-[16px] text-ink placeholder:text-muted outline-none focus:border-brand"
              />
            </div>

            {method === 'email' ? (
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-ink">Email address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="selam.abebe@example.com"
                  className="min-h-[48px] w-full rounded-[10px] border border-border-subtle bg-surface px-4 py-3 text-[16px] text-ink placeholder:text-muted outline-none focus:border-brand"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-ink">Phone number *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+251 911 234 567"
                  className="min-h-[48px] w-full rounded-[10px] border border-border-subtle bg-surface px-4 py-3 text-[16px] text-ink placeholder:text-muted outline-none focus:border-brand"
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-ink">Password *</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="min-h-[48px] w-full rounded-[10px] border border-border-subtle bg-surface px-4 py-3 text-[16px] text-ink placeholder:text-muted outline-none focus:border-brand"
              />
              <p className="text-[13px] text-muted">
                Use at least 8 characters, including a number.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-ink">Confirm password *</label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="min-h-[48px] w-full rounded-[10px] border border-border-subtle bg-surface px-4 py-3 text-[16px] text-ink placeholder:text-muted outline-none focus:border-brand"
              />
            </div>

            <p className="text-[13px] text-muted">
              By creating an account, you agree to our Terms of service and Privacy policy.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="min-h-[48px] px-5 py-3 rounded-[10px] bg-brand text-[16px] font-semibold text-white hover:bg-brand-hover disabled:opacity-60 transition-colors"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
              <Link
                href="/auth/sign-in"
                className="inline-flex items-center min-h-[48px] px-5 py-3 rounded-[10px] border border-border-subtle bg-surface text-[16px] font-semibold text-ink hover:bg-canvas transition-colors"
              >
                Already have an account? Sign in
              </Link>
            </div>
          </form>

          <p className="text-[13px] text-muted">
            Prefer your phone? Register with +251 and verify a 6-digit code instead.
          </p>
        </div>
      </main>
    </div>
  );
}
