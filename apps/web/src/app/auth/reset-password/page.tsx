'use client';

import { useState } from 'react';
import Link from 'next/link';
import { StorefrontHeader } from '@/components/storefront-header';
import { apiFetch, ApiError } from '@/lib/api';

export default function ResetPasswordPage() {
  const [method, setMethod] = useState<'phone' | 'email'>('phone');
  const [target, setTarget] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [devCode, setDevCode] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [loadingStep, setLoadingStep] = useState<1 | 2 | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoadingStep(1);
    try {
      const res = await apiFetch<{ sent: boolean; target: string; devOtpCode?: string }>(
        '/auth/otp/request',
        {
          method: 'POST',
          body: JSON.stringify({ target, purpose: 'PASSWORD_RESET' }),
        },
      );
      setTarget(res.target);
      setCodeSent(true);
      if (res.devOtpCode) {
        setDevCode(res.devOtpCode);
        setCode(res.devOtpCode);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to send reset code.');
    } finally {
      setLoadingStep(null);
    }
  }

  async function handleConfirmReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoadingStep(2);
    try {
      await apiFetch('/auth/password-reset/confirm', {
        method: 'POST',
        body: JSON.stringify({ target, code, newPassword }),
      });
      setResetSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reset password.');
    } finally {
      setLoadingStep(null);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <StorefrontHeader />

      <main className="max-w-[1440px] w-full mx-auto px-6 lg:px-16 pt-8 pb-16 flex flex-col gap-6">
        <div>
          <h1 className="text-[28px] font-bold text-ink">Account recovery</h1>
          <p className="text-[16px] text-muted mt-1">
            Recover access with your phone number or email.
          </p>
        </div>

        {error && (
          <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* Step 1: Request a reset */}
          <section className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-4">
            <h2 className="text-[20px] font-semibold text-ink">1 &nbsp;Request a reset</h2>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setMethod('phone')}
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
                onClick={() => setMethod('email')}
                className={`min-h-[48px] px-5 py-3 rounded-[10px] text-[16px] font-semibold border transition-colors ${
                  method === 'email'
                    ? 'bg-brand border-brand text-white'
                    : 'bg-surface border-border-subtle text-ink hover:bg-canvas'
                }`}
              >
                Email
              </button>
            </div>

            <form onSubmit={handleRequestReset} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-ink">
                  {method === 'phone' ? 'Phone number' : 'Email address'}
                </label>
                <input
                  type={method === 'email' ? 'email' : 'tel'}
                  required
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder={method === 'phone' ? '+251 911 234 567' : 'selam@example.com'}
                  className="min-h-[48px] w-full rounded-[10px] border border-border-subtle bg-surface px-4 py-3 text-[16px] text-ink placeholder:text-muted outline-none focus:border-brand"
                />
              </div>

              <p className="text-[13px] text-muted">
                If an account exists, we’ll send a verification code. Your cart stays saved.
              </p>

              {codeSent && (
                <div className="rounded-[10px] border border-brand/30 bg-brand-tint px-4 py-3 text-[13px] text-brand">
                  Reset code sent to <span className="font-semibold">{target}</span>.
                  {devCode ? ` (Dev code: ${devCode})` : ''}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={loadingStep === 1}
                  className="min-h-[48px] px-5 py-3 rounded-[10px] bg-brand text-[16px] font-semibold text-white hover:bg-brand-hover disabled:opacity-60 transition-colors"
                >
                  {loadingStep === 1 ? 'Sending...' : 'Send reset code'}
                </button>
                <Link
                  href="/auth/sign-in"
                  className="inline-flex items-center min-h-[48px] px-5 py-3 rounded-[10px] border border-border-subtle bg-surface text-[16px] font-semibold text-ink hover:bg-canvas transition-colors"
                >
                  Back to sign in
                </Link>
              </div>
            </form>
          </section>

          {/* Step 2: Set a new password */}
          <section className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-4">
            <h2 className="text-[20px] font-semibold text-ink">2 &nbsp;Set a new password</h2>
            <p className="text-[13px] text-muted">
              Available after you verify the code sent to your phone or email.
            </p>

            <form onSubmit={handleConfirmReset} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-ink">Verification code *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="6-digit code"
                  className="min-h-[48px] w-full rounded-[10px] border border-border-subtle bg-surface px-4 py-3 text-[16px] text-ink placeholder:text-muted outline-none focus:border-brand"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-ink">New password *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="min-h-[48px] w-full rounded-[10px] border border-border-subtle bg-surface px-4 py-3 text-[16px] text-ink placeholder:text-muted outline-none focus:border-brand"
                />
                <p className="text-[13px] text-muted">
                  Use at least 8 characters, including a number.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-ink">Confirm new password *</label>
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

              <div>
                <button
                  type="submit"
                  disabled={loadingStep === 2 || !target}
                  className="min-h-[48px] px-5 py-3 rounded-[10px] bg-brand text-[16px] font-semibold text-white hover:bg-brand-hover disabled:opacity-60 transition-colors"
                >
                  {loadingStep === 2 ? 'Updating...' : 'Reset password'}
                </button>
              </div>
            </form>

            {resetSuccess && (
              <div className="rounded-[14px] border border-border-subtle bg-brand-tint p-6 flex flex-col gap-2 text-brand">
                <p className="text-[16px] font-semibold">✓ Your password has been reset.</p>
                <p className="text-[13px]">Sign in again with your new password.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
