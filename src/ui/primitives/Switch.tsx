import { Switch as UiSwitch, SwitchThumb } from '@ui-sdk/react/switch';
import type { ComponentProps } from 'react';
import { cx } from './cx';

export interface SwitchProps extends Omit<ComponentProps<typeof UiSwitch>, 'className' | 'children'> {
  className?: string;
}

export function Switch({ className, ...props }: SwitchProps) {
  return (
    <UiSwitch {...props} className={cx('xh-switch', className)}>
      <SwitchThumb className='xh-switch-thumb' />
    </UiSwitch>
  );
}
