import { Avatar as UiAvatar, AvatarFallback, AvatarImage } from '@ui-sdk/react/avatar';
import type { CSSProperties } from 'react';
import { cx } from './cx';

export const AVATAR_COLORS = [
  '#4f5d75',
  '#5b6b82',
  '#6a5a8c',
  '#3f6b5c',
  '#7a5644',
  '#4f6a8f',
  '#82576b',
  '#3d6574',
] as const;

export function avatarColor(seed: string) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function initials(name: string) {
  const words = name.trim().replace(/^@/, '').split(/[\s_.-]+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return Array.from(words[0]).slice(0, 2).join('').toUpperCase();
  return (Array.from(words[0])[0] + Array.from(words[1])[0]).toUpperCase();
}

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'lg' | 'md' | 'sm' | 'xs';
  className?: string;
}

export function Avatar({ name, src, size = 'lg', className }: AvatarProps) {
  return (
    <UiAvatar
      className={cx('xh-avatar', className)}
      data-size={size}
      style={{ '--xh-av': avatarColor(name) } as CSSProperties}
    >
      {src ? <AvatarImage src={src} alt='' className='xh-avatar-img' /> : null}
      <AvatarFallback aria-hidden className='xh-avatar-fallback'>
        {initials(name)}
      </AvatarFallback>
    </UiAvatar>
  );
}
