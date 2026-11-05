import type { KolInteractionItem } from '~contents/services/api';

export const SOCIAL_CIRCLE_VIEWBOX_SIZE = 1000;
export const SOCIAL_CIRCLE_CENTER = SOCIAL_CIRCLE_VIEWBOX_SIZE / 2;
// Positions and diameters share the same coordinate system in the UI and export.
export const SOCIAL_CIRCLE_CENTER_SIZE = 250;
export const SOCIAL_CIRCLE_INNER_RADIUS = 230;
export const SOCIAL_CIRCLE_OUTER_RADIUS = 410;

export type SocialCircleScoreTier = 'large' | 'medium' | 'small';

export interface SocialCircleLayoutNode {
  item: KolInteractionItem;
  rank: number;
  ring: 'inner' | 'outer';
  tier: SocialCircleScoreTier;
  x: number;
  y: number;
  size: number;
}

export const getInnerRingCount = (items: KolInteractionItem[]): number => {
  return Math.min(7, items.length);
};

const layoutRing = (
  items: KolInteractionItem[],
  rankOffset: number,
  ring: 'inner' | 'outer',
  radius: number,
): SocialCircleLayoutNode[] => {
  if (!items.length) return [];

  const angleStep = (Math.PI * 2) / items.length;
  const startAngle =
    -Math.PI / 2 + (ring === 'outer' && items.length > 1 ? angleStep / 2 : 0);

  return items.map((item, index) => {
    const angle = startAngle + angleStep * index;
    return {
      item,
      rank: rankOffset + index + 1,
      ring,
      tier: ring === 'inner' ? 'medium' : 'small',
      x: SOCIAL_CIRCLE_CENTER + Math.cos(angle) * radius,
      y: SOCIAL_CIRCLE_CENTER + Math.sin(angle) * radius,
      size: ring === 'inner' ? 180 : 150,
    };
  });
};

export const createSocialCircleLayout = (
  rawItems: KolInteractionItem[],
): SocialCircleLayoutNode[] => {
  const items = rawItems.slice(0, 20);
  const innerCount = getInnerRingCount(items);

  return [
    ...layoutRing(
      items.slice(0, innerCount),
      0,
      'inner',
      SOCIAL_CIRCLE_INNER_RADIUS,
    ),
    ...layoutRing(
      items.slice(innerCount),
      innerCount,
      'outer',
      SOCIAL_CIRCLE_OUTER_RADIUS,
    ),
  ];
};

export const getProfileInitial = (
  name?: string | null,
  username?: string | null,
): string => {
  const value = (name || username || '?').trim();
  return Array.from(value)[0]?.toUpperCase() || '?';
};

export const getSafeAvatarUrl = (avatar?: string | null): string => {
  if (!avatar) return '';
  try {
    const url = new URL(avatar);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
};

export const getSafeUsername = (username?: string | null): string => {
  const normalized = String(username || '')
    .trim()
    .replace(/^@+/, '');
  return /^[A-Za-z0-9_]{1,15}$/.test(normalized) ? normalized : '';
};
