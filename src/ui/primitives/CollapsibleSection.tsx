import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '@ui-sdk/react/collapsible';
import type { ReactNode } from 'react';
import { ChevronDownIcon } from '../icons';
import { cx } from './cx';

export interface CollapsibleSectionProps {
  title: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
  testId?: string;
  triggerTestId?: string;
}

export function CollapsibleSection({
  title,
  open,
  onOpenChange,
  children,
  className,
  testId,
  triggerTestId,
}: CollapsibleSectionProps) {
  return (
    <Collapsible
      open={open}
      onOpenChange={(next) => onOpenChange(next)}
      className={cx('xh-collapsible', className)}
      data-xhunt-testid={testId}
    >
      <CollapsibleTrigger className='xh-collapsible-trigger' data-xhunt-testid={triggerTestId}>
        <span className='xh-collapsible-title'>{title}</span>
        <ChevronDownIcon size={14} className='xh-collapsible-chevron' />
      </CollapsibleTrigger>
      <CollapsiblePanel className='xh-collapsible-panel'>{children}</CollapsiblePanel>
    </Collapsible>
  );
}
