import { Input } from '@ui-sdk/react/input';
import { useEffect, useRef } from 'react';
import { SearchIcon } from '../icons';
import { cx } from './cx';

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
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  useEffect(() => {
    // X 的快捷键挂在 document 捕获阶段，window 捕获阶段更早，在这里挡住才来得及
    const guard = (event: KeyboardEvent) => {
      const input = inputRef.current;
      if (!input || event.isComposing || !event.composedPath().includes(input)) return;
      event.stopImmediatePropagation();
      if (event.type === 'keydown' && event.key === 'Enter') {
        event.preventDefault();
        onSubmitRef.current?.(input.value);
      }
    };
    const types = ['keydown', 'keypress', 'keyup'] as const;
    types.forEach((type) => window.addEventListener(type, guard, true));
    return () => types.forEach((type) => window.removeEventListener(type, guard, true));
  }, []);

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
