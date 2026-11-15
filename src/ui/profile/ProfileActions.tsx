import type { Ref } from 'react';
import { SocialCircleIcon, SparkleIcon } from '../icons';

export interface KolChatItem {
  twitter_handle: string;
  type?: string;
  visibility?: string;
  name?: string;
  id?: string;
  perspective_name_zh?: string;
  perspective_name_en?: string;
}

export function visibleKols(list: unknown, isTester: boolean): KolChatItem[] {
  if (!Array.isArray(list)) return [];
  return (list as KolChatItem[]).filter((item) => item.visibility === 'public' || isTester);
}

export function findKol(list: KolChatItem[], handle: string | null | undefined) {
  if (!handle) return undefined;
  const normalized = handle.toLowerCase().replace(/^@/, '');
  return list.find((kol) => kol.twitter_handle?.toLowerCase() === normalized);
}

export function kolButtonLabel(kol: KolChatItem, lang: string, t: (key: string) => string) {
  const zh = lang === 'zh';
  const perspective = zh ? kol.perspective_name_zh : kol.perspective_name_en;
  if (kol.type === 'official') return perspective || t('aiAvatar');
  return perspective || (zh ? `${kol.name}思维` : `${kol.name} Perspective`);
}

export function AiPill({
  ref,
  label,
  badge,
  onClick,
}: {
  ref?: Ref<HTMLButtonElement>;
  label: string;
  badge: string;
  onClick: () => void;
}) {
  return (
    <button ref={ref} type='button' className='xh-aipill' onClick={onClick}>
      <SparkleIcon size={16} className='xh-aipill-spark' />
      {label}
      <span className='xh-beta'>{badge}</span>
    </button>
  );
}

export function SocialCircleButton({
  ref,
  label,
  badge,
  expanded,
  disabled,
  onClick,
}: {
  ref?: Ref<HTMLButtonElement>;
  label: string;
  badge: string;
  expanded: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      ref={ref}
      type='button'
      className='xh-circbtn'
      aria-label={label}
      aria-haspopup='dialog'
      aria-expanded={expanded}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <SocialCircleIcon size={18} />
      <span className='xh-newdot' aria-hidden='true'>
        {badge}
      </span>
    </button>
  );
}
