import { Input } from '@ui-sdk/react/input';
import { useRef } from 'react';
import { cx } from './cx';
import { useKeyGuard } from './useKeyGuard';

export interface TextFieldProps {
  value: string;
  onValueChange: (value: string) => void;
  'aria-label': string;
  placeholder?: string;
  onSubmit?: (value: string) => void;
  invalid?: boolean;
  className?: string;
  testId?: string;
}

export function TextField({
  value,
  onValueChange,
  placeholder,
  onSubmit,
  invalid = false,
  className,
  testId,
  ...rest
}: TextFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  useKeyGuard(inputRef, onSubmit);

  return (
    <label className={cx('xh-search', className)} data-invalid={invalid ? '' : undefined}>
      <Input
        ref={inputRef}
        value={value}
        onValueChange={(next) => onValueChange(next)}
        placeholder={placeholder}
        aria-label={rest['aria-label']}
        aria-invalid={invalid || undefined}
        className='xh-search-input'
        data-xhunt-testid={testId}
      />
    </label>
  );
}
