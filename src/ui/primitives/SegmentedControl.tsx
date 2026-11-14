import {
  SegmentedControl as UiSegmentedControl,
  SegmentedControlIndicator,
  SegmentedControlItem,
} from '@ui-sdk/react/segmented-control';
import type { ReactNode } from 'react';
import { cx } from './cx';

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  testId?: string;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly SegmentedOption<T>[];
  'aria-label': string;
  size?: 'md' | 'sm';
  block?: boolean;
  disabled?: boolean;
  className?: string;
}

export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  size = 'md',
  block = false,
  disabled,
  className,
  ...rest
}: SegmentedControlProps<T>) {
  return (
    <UiSegmentedControl
      value={value}
      onValueChange={(next) => {
        if (next !== null) onValueChange(next as T);
      }}
      disabled={disabled}
      aria-label={rest['aria-label']}
      className={cx('xh-seg', className)}
      data-size={size}
      data-block={block ? '' : undefined}
    >
      <SegmentedControlIndicator className='xh-seg-indicator' />
      {options.map((option) => (
        <SegmentedControlItem
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          className='xh-seg-item'
          data-xhunt-testid={option.testId}
        >
          {option.label}
        </SegmentedControlItem>
      ))}
    </UiSegmentedControl>
  );
}
