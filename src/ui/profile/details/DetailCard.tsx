import type { ReactNode } from 'react';
import { useI18n } from '~contents/hooks/i18n';
import { cx } from '~/ui/primitives/cx';

export interface DetailCardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  avatar?: ReactNode;
  aside?: ReactNode;
  footer?: ReactNode;
  footerEnd?: ReactNode;
  size?: 'md' | 'lg';
  className?: string;
  testId?: string;
  children?: ReactNode;
}

export function DetailCard({
  title,
  subtitle,
  icon,
  avatar,
  aside,
  footer,
  footerEnd,
  size = 'md',
  className,
  testId,
  children,
}: DetailCardProps) {
  return (
    <div className={cx('xh-dcard', className)} data-size={size} data-xhunt-testid={testId}>
      <div className='xh-dcard-head'>
        {avatar}
        {icon ? (
          <span className='xh-dcard-icon' aria-hidden='true'>
            {icon}
          </span>
        ) : null}
        <div className='xh-dcard-titles'>
          <p className='xh-dcard-title'>{title}</p>
          {subtitle ? <p className='xh-dcard-sub'>{subtitle}</p> : null}
        </div>
        {aside ? <div className='xh-dcard-aside'>{aside}</div> : null}
      </div>
      {children ? <div className='xh-dcard-body'>{children}</div> : null}
      {footer || footerEnd ? (
        <div className='xh-dcard-foot'>
          {footer ? <span>{footer}</span> : null}
          {footerEnd ? <span className='xh-dcard-foot-end'>{footerEnd}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

export function DetailSection({ title, className, children }: { title?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={cx('xh-dsec', className)}>
      {title ? <p className='xh-dsec-title'>{title}</p> : null}
      {children}
    </section>
  );
}

export function DetailNote({ label, children }: { label?: ReactNode; children: ReactNode }) {
  return (
    <p className='xh-dnote'>
      {label ? <b className='xh-dnote-label'>{label}</b> : null}
      {children}
    </p>
  );
}

export function DetailEmpty({ children }: { children: ReactNode }) {
  return <p className='xh-dempty'>{children}</p>;
}

export function XHuntCredit() {
  const { t } = useI18n();
  return (
    <>
      <a
        className='xh-dcard-link'
        href='https://x.com/xhunt_ai'
        target='_blank'
        rel='noopener noreferrer'
        onClick={(event) => event.stopPropagation()}
      >
        XHunt AI
      </a>
      {' · '}
      {t('forReferenceOnly')}
    </>
  );
}
