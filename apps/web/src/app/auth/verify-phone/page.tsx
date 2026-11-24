'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { StorefrontHeader } from '@/components/storefront-header';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuthStore, type SessionUser } from '@/lib/auth-store';

function VerifyPhoneContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);

  const target = searchParams.get('target') ?? '+251911000003';
  const [devCode, setDevCode] = useState<string | null>(searchParams.get('devCode'));
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(42);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  function handleDigitChange(index: number, value: string) {
    const clean = value.replace(/\D/g, '');
    if (clean.length > 1) {
      const next = [...digits];
      for (let i = 0; i < 6 && i < clean.length; i++) {
        next[i] = clean[i] ?? '';
      }
      setDigits(next);
      inputsRef.current[Math.min(clean.length, 5)]?.focus();
      return;
    }

    const next = [...digits];
    next[index] = clean;
    setDigits(next);
    if (clean && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    const code = digits.join('');
    if (code.length !== 6) {
      setError('Enter all 6 digits of your verification code.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<{
        verified: boolean;
        accountExists?: boolean;
        accessToken?: string;
        refreshToken?: string;
        user?: SessionUser;
      }>('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ target, code, purpose: 'PHONE_VERIFY' }),
      });

      if (res.accessToken && res.refreshToken && res.user) {
        setSession({
          accessToken: res.accessToken,
          refreshToken: res.refreshToken,
          user: res.user,
        });
        const isStaff = res.user.roles.some((r) => r !== 'CUSTOMER');
        router.push(isStaff ? '/dashboard' : '/');
      } else {
        router.push(`/auth/register?phone=${encodeURIComponent(target)}`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Verification failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    try {
      const res = await apiFetch<{ devOtpCode?: string }>('/auth/otp/request', {
        method: 'POST',
        body: JSON.stringify({ target, purpose: 'PHONE_VERIFY' }),
      });
      if (res.devOtpCode) setDevCode(res.devOtpCode);
      setCountdown(60);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to resend code.');
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <StorefrontHeader />

      <main className="max-w-[1440px] w-full mx-auto px-6 lg:px-16 pt-8 pb-16 flex justify-center">
        <div className="w-full max-w-[560px] rounded-[14px] border border-border-subtle bg-surface p-6 lg:p-8 flex flex-col gap-4">
          <Link href="/auth/sign-in" className="text-[13px] font-medium text-brand hover:underline">
            ← Back to sign in
          </Link>

          <h1 className="text-[28px] font-bold text-ink">Check your phone</h1>
          <p className="text-[16px] text-muted">
            Enter the 6-digit code sent to <span className="font-medium text-ink">{target}</span>.
          </p>

          <div>
            <Link
              href="/auth/sign-in"
              className="inline-flex items-center min-h-[48px] px-5 py-3 rounded-[10px] border border-border-subtle bg-surface text-[16px] font-semibold text-ink hover:bg-canvas transition-colors"
            >
              Change phone number
            </Link>
          </div>

          {devCode && (
            <div className="rounded-[10px] border border-brand/30 bg-brand-tint px-4 py-3 text-[13px] text-brand">
              Dev preview code: <span className="font-bold tracking-widest">{devCode}</span>
            </div>
          )}

          {error && (
            <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleVerify} className="flex flex-col gap-4">
            <label className="text-[13px] font-medium text-ink">Verification code</label>
            <div className="grid grid-cols-6 gap-3">
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    inputsRef.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className="h-[56px] w-full rounded-[14px] border border-border-subtle bg-surface text-center text-[20px] font-semibold text-ink outline-none focus:border-brand"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="min-h-[48px] w-full rounded-[10px] bg-brand px-5 py-3 text-[16px] font-semibold text-white hover:bg-brand-hover disabled:opacity-60 transition-colors"
            >
              {loading ? 'Verifying...' : 'Verify and continue'}
            </button>
          </form>

          <div className="text-[13px] text-muted">
            {countdown > 0 ? (
              <span>Resend code in 00:{String(countdown).padStart(2, '0')}</span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="font-semibold text-brand hover:underline"
              >
                Resend verification code
              </button>
            )}
          </div>

          <p className="text-[13px] text-muted">
            If the code expires, request a new one.
          </p>

          <div className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-2">
            <p className="text-[16px] font-semibold text-ink">Having trouble?</p>
            <p className="text-[13px] text-muted">
              Check the number above or try signing in with email.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function VerifyPhonePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <VerifyPhoneContent />
    </Suspense>
  );
}
