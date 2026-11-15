import { Input } from '@ui-sdk/react/input';
import { useRef } from 'react';
import { SearchIcon } from '../icons';
import { cx } from './cx';
import { useKeyGuard } from './useKeyGuard';

export interface SearchFieldProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  'aria-label': string;
  shortcut?: string;
  onSubmit?: (value: string) => void;
  className?: string;
  testId?: string;
}

export function SearchField({
  value,
  onValueChange,
  placeholder,
  shortcut,
  onSubmit,
  className,
  testId,
  ...rest
}: SearchFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  useKeyGuard(inputRef, onSubmit);

  return (
    <label className={cx('xh-search', className)}>
      <SearchIcon size={14} className='xh-search-icon' />
      <Input
        ref={inputRef}
        type='search'
        value={value}
        onValueChange={(next) => onValueChange(next)}
        placeholder={placeholder}
        aria-label={rest['aria-label']}
        className='xh-search-input'
        data-xhunt-testid={testId}
      />
      {shortcut ? (
        <kbd aria-hidden='true' className='xh-kbd'>
          {shortcut}
        </kbd>
      ) : null}
    </label>
  );
}
