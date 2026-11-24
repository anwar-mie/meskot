'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatEtb } from '@meskot/shared-types';
import { StorefrontHeader } from '@/components/storefront-header';
import { apiFetch, ApiError } from '@/lib/api';

function MockPayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref') ?? '';
  const orderNumber = searchParams.get('orderNumber') ?? '';
  const amount = Number(searchParams.get('amount') ?? 0);

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function simulate(status: 'success' | 'failed') {
    setProcessing(true);
    setError(null);
    try {
      await apiFetch('/payments/webhooks/mock_online', {
        method: 'POST',
        body: JSON.stringify({ tx_ref: ref, status }),
      });
      router.push(`/orders/${orderNumber}/confirmation`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Payment simulation failed.');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <StorefrontHeader />
      <main className="max-w-[560px] w-full mx-auto px-6 py-12">
        <div className="rounded-[14px] border border-border-subtle bg-surface p-8 flex flex-col gap-5">
          <span className="self-start rounded-full bg-brand-tint px-3 py-1 text-[12px] font-semibold text-brand">
            Local Chapa Sandbox Simulator
          </span>
          <h1 className="text-[24px] font-bold text-ink">Complete online payment</h1>
          <p className="text-[15px] text-muted">
            Order <strong className="text-ink">{orderNumber}</strong> · Reference{' '}
            <code className="text-[13px]">{ref}</code>
          </p>
          <p className="text-[28px] font-bold text-brand">{formatEtb(amount)}</p>

          {error && (
            <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              type="button"
              disabled={processing}
              onClick={() => simulate('success')}
              className="min-h-[48px] w-full rounded-[10px] bg-brand text-[16px] font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
            >
              {processing ? 'Processing...' : '✓ Simulate successful payment'}
            </button>
            <button
              type="button"
              disabled={processing}
              onClick={() => simulate('failed')}
              className="min-h-[48px] w-full rounded-[10px] border border-border-subtle bg-surface text-[15px] font-semibold text-warning hover:bg-warning-tint/40"
            >
              Simulate failed payment
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function MockPayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <MockPayContent />
    </Suspense>
  );
}
