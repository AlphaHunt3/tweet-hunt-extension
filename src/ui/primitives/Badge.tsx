import type { ReactNode } from 'react';
import { cx } from './cx';

export type BadgeTone = 'neutral' | 'accent' | 'up' | 'down' | 'warn' | 'inverse';

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={cx('xh-badge', className)} data-tone={tone}>
      {children}
    </span>
  );
}

export function Tag({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cx('xh-tag', className)}>{children}</span>;
}
