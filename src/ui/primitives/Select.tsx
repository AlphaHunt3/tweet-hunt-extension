import {
  Select as UiSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui-sdk/react/select';
import { ChevronDownIcon } from '../icons';
import { cx } from './cx';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export interface SelectProps<T extends string> {
  value: T | null;
  onValueChange: (value: T) => void;
  options: readonly SelectOption<T>[];
  'aria-label': string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  testId?: string;
}

export function Select<T extends string>({
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  className,
  testId,
  ...rest
}: SelectProps<T>) {
  return (
    <UiSelect
      items={options.map((option) => ({ value: option.value, label: option.label }))}
      value={value}
      onValueChange={(next) => {
        if (typeof next === 'string') onValueChange(next as T);
      }}
      placeholder={placeholder}
      disabled={disabled}
    >
      <SelectTrigger
        aria-label={rest['aria-label']}
        className={cx('xh-select', className)}
        data-xhunt-testid={testId}
      >
        <SelectValue className='xh-select-value' />
        <ChevronDownIcon size={12} className='xh-select-chevron' />
      </SelectTrigger>
      <SelectContent className='xh-select-content'>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} className='xh-select-item'>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </UiSelect>
  );
}
