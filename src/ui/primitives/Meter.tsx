import { Meter as UiMeter, MeterIndicator, MeterTrack } from '@ui-sdk/react/meter';
import { cx } from './cx';

export interface MeterProps {
  value: number;
  max?: number;
  label: string;
  tone?: 'accent' | 'up' | 'warn';
  className?: string;
}

export function Meter({ value, max = 100, label, tone = 'accent', className }: MeterProps) {
  return (
    <UiMeter value={value} max={max} aria-label={label} className={cx('xh-meter', className)} data-tone={tone}>
      <MeterTrack className='xh-meter-track'>
        <MeterIndicator className='xh-meter-indicator' />
      </MeterTrack>
    </UiMeter>
  );
}
