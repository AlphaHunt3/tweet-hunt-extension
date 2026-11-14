import type { ReactNode } from 'react';
import { cx } from '../primitives/cx';

export function PanelCard({
  id,
  flush = false,
  className,
  children,
}: {
  id?: string;
  flush?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cx(
        'xh-rise',
        'soft:rounded-xh-card soft:bg-xh-raised soft:shadow-xh-card',
        'obsidian:rounded-xh-card obsidian:bg-xh-raised obsidian:shadow-xh-card',
        'native:border-b native:border-xh-line',
        flush
          ? 'soft:p-1.5 obsidian:p-1 native:py-1'
          : 'soft:p-3 obsidian:px-3 obsidian:py-2.5 native:px-4 native:py-3',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardHeader({ title, aside, icon }: { title: ReactNode; aside?: ReactNode; icon?: ReactNode }) {
  return (
    <div className='mb-2.5 flex min-h-6 items-center justify-between gap-2'>
      <h3 className='flex min-w-0 items-center gap-1.5 truncate soft:text-[13px] soft:font-semibold obsidian:text-[11.5px] obsidian:font-medium obsidian:text-xh-fg-2 native:text-[15px] native:font-extrabold'>
        {icon ? <span className='flex text-xh-fg-2'>{icon}</span> : null}
        {title}
      </h3>
      {aside}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className='py-6 text-center text-[12px] text-xh-fg-2 native:text-[14px]'>{children}</p>;
}

export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden='true' className={cx('xh-skeleton', className)} />;
}
