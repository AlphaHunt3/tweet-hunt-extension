import {
  Popover as UiPopover,
  PopoverClose as UiPopoverClose,
  PopoverContent as UiPopoverContent,
  PopoverDescription as UiPopoverDescription,
  PopoverTitle as UiPopoverTitle,
  PopoverTrigger as UiPopoverTrigger,
} from '@ui-sdk/react/popover';
import type { ComponentProps } from 'react';
import { cx } from './cx';

export const Popover = UiPopover;
export const PopoverTrigger = UiPopoverTrigger;
export const PopoverClose = UiPopoverClose;

type WithClassName<P> = Omit<P, 'className'> & { className?: string };

export function PopoverContent({
  className,
  sideOffset = 8,
  collisionPadding = 12,
  ...props
}: WithClassName<ComponentProps<typeof UiPopoverContent>>) {
  return (
    <UiPopoverContent
      sideOffset={sideOffset}
      collisionPadding={collisionPadding}
      className={cx('xh-popover', className)}
      {...props}
    />
  );
}

export function PopoverTitle({ className, ...props }: WithClassName<ComponentProps<typeof UiPopoverTitle>>) {
  return <UiPopoverTitle className={cx('xh-popover-title', className)} {...props} />;
}

export function PopoverDescription({
  className,
  ...props
}: WithClassName<ComponentProps<typeof UiPopoverDescription>>) {
  return <UiPopoverDescription className={cx('xh-popover-desc', className)} {...props} />;
}
