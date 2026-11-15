import type { ReactNode } from 'react';
import { Meter } from '~/ui/primitives/Meter';

export interface MeterRowProps {
  label: string;
  value: number | null | undefined;
  max?: number;
  hint?: string;
  tone?: 'accent' | 'up' | 'warn';
}

export function MeterRow({ label, value, max = 100, hint, tone }: MeterRowProps) {
  const known = typeof value === 'number' && Number.isFinite(value);
  const shown = known ? Math.round(Math.min(Math.max(value, 0), max)) : null;
  return (
    <div className='xh-mrow'>
      <span className='xh-mrow-label' title={hint}>
        {label}
      </span>
      <Meter value={shown ?? 0} max={max} label={label} tone={tone} />
      <b className='xh-mrow-value'>{shown ?? '—'}</b>
    </div>
  );
}

export function MeterRows({ children }: { children: ReactNode }) {
  return <div className='xh-mrows'>{children}</div>;
}
