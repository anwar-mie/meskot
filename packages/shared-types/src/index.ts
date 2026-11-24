export function formatEtb(amount: number | string): string {
  const numeric = typeof amount === 'string' ? Number(amount) : amount;
  if (Number.isNaN(numeric)) return 'ETB 0.00';
  return `ETB ${numeric.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export * from './status-transitions';
export * from './permissions';
