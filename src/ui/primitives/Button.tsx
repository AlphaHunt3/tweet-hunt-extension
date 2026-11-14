import { Button as UiButton } from '@ui-sdk/react/button';
import type { ComponentProps, ReactNode } from 'react';
import { cx } from './cx';

type UiButtonProps = Omit<ComponentProps<typeof UiButton>, 'className'>;

export type ButtonVariant = 'default' | 'primary' | 'soft' | 'inverse';

export interface ButtonProps extends UiButtonProps {
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  block?: boolean;
  className?: string;
}

export function Button({
  variant = 'default',
  size = 'md',
  block = false,
  className,
  ...props
}: ButtonProps) {
  return (
    <UiButton
      {...props}
      className={cx('xh-btn', className)}
      data-variant={variant}
      data-size={size}
      data-block={block ? '' : undefined}
    />
  );
}

export interface IconButtonProps extends Omit<UiButtonProps, 'children' | 'aria-label'> {
  label: string;
  children: ReactNode;
  dot?: boolean;
  size?: 'md' | 'sm';
  className?: string;
}

export function IconButton({
  label,
  dot = false,
  size = 'md',
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <UiButton
      {...props}
      aria-label={label}
      title={label}
      className={cx('xh-iconbtn', className)}
      data-size={size}
    >
      {children}
      {dot ? <span aria-hidden='true' className='xh-iconbtn-dot' /> : null}
    </UiButton>
  );
}
