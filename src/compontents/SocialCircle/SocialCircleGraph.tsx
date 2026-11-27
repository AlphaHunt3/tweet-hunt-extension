import React, { useMemo, useState } from 'react';
import { navigateInX } from '~contents/utils/navigateInX';
import type { KolInteractionsData } from '~contents/services/api';
import {
  createSocialCircleLayout,
  getProfileInitial,
  getSafeAvatarUrl,
  getSafeUsername,
  getSocialCircleRank,
  getSocialCircleRankDisplay,
  SOCIAL_CIRCLE_CENTER_SIZE,
  SOCIAL_CIRCLE_VIEWBOX_SIZE,
  type SocialCircleLayoutNode,
  type SocialCircleRankMap,
  type SocialCircleRankMode,
} from './socialCircleLayout';

type Translate = (key: string, fallback?: string) => string;

const replaceTokens = (
  template: string,
  values: Record<string, string | number>,
) =>
  Object.entries(values).reduce(
    (result, [key, value]) => result.split(`{${key}}`).join(String(value)),
    template,
  );

function CircleAvatar({
  avatar,
  name,
  username,
  className = '',
}: {
  avatar?: string | null;
  name?: string | null;
  username?: string | null;
  className?: string;
}) {
  const safeAvatar = getSafeAvatarUrl(avatar);
  const [failedUrl, setFailedUrl] = useState('');
  const showImage = safeAvatar && failedUrl !== safeAvatar;

  if (showImage) {
    return (
      <img
        src={safeAvatar}
        alt=''
        className={`h-full w-full rounded-full object-cover ${className}`}
        draggable={false}
        decoding='async'
        onError={() => setFailedUrl(safeAvatar)}
      />
    );
  }

  return (
    <span
      aria-hidden='true'
      className={`flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-[#1D9BF0] to-[#7C3AED] font-bold text-white ${className}`}
    >
      {getProfileInitial(name, username)}
    </span>
  );
}

function InteractionRow({
  source,
  target,
  score,
  t,
}: {
  source: string;
  target: string;
  score: number;
  t: Translate;
}) {
  return (
    <div className='flex items-center gap-2 text-[11px] theme-text-secondary'>
      <div className='flex min-w-0 flex-1 items-center gap-1'>
        <span className='min-w-0 flex-1 truncate'>{source}</span>
        <span aria-hidden='true'>→</span>
        <span className='min-w-0 flex-1 truncate'>{target}</span>
      </div>
      <span className='shrink-0 tabular-nums theme-text-primary'>
        {score} {t('socialCirclePoints', 'pts')}
      </span>
    </div>
  );
}

function SocialCircleTooltip({
  node,
  data,
  t,
}: {
  node: SocialCircleLayoutNode;
  data: KolInteractionsData;
  t: Translate;
}) {
  const source =
    data.kol.name?.trim() || t('socialCircleUnknownUser', 'Unknown user');
  const target =
    node.item.kol.name?.trim() || t('socialCircleUnknownUser', 'Unknown user');
  const placeBelow = node.y < 320;
  const horizontalTransform =
    node.x < 300 ? '0%' : node.x > 700 ? '-100%' : '-50%';
  const verticalTransform = placeBelow ? '18px' : 'calc(-100% - 18px)';

  return (
    <div
      role='tooltip'
      className='pointer-events-none absolute z-30 w-[min(260px,calc(100%_-_16px))] rounded-xl border theme-border theme-bg-secondary p-2.5 text-left shadow-lg'
      style={{
        left: `${node.x / 10}%`,
        top: `${node.y / 10}%`,
        transform: `translate(${horizontalTransform}, ${verticalTransform})`,
      }}
    >
      <div className='flex items-center gap-2'>
        <div className='h-6 w-6 shrink-0 overflow-hidden rounded-full border theme-border-soft'>
          <CircleAvatar
            avatar={node.item.kol.avatar}
            name={node.item.kol.name}
            username={node.item.kol.username}
            className='text-sm'
          />
        </div>
        <div className='min-w-0 flex-1'>
          <div className='truncate text-xs font-bold theme-text-primary'>
            {target}
          </div>
        </div>
        <div className='text-right'>
          <div className='text-[10px] theme-text-secondary'>
            {t('socialCircleMutualScore', 'Mutual score')}
          </div>
          <div className='text-sm font-bold tabular-nums theme-text-primary'>
            {node.item.score}
          </div>
        </div>
      </div>

      <div className='mt-2 space-y-1 border-t theme-border pt-2'>
        <InteractionRow
          source={source}
          target={target}
          score={node.item.outgoing_score}
          t={t}
        />
        <InteractionRow
          source={target}
          target={source}
          score={node.item.incoming_score}
          t={t}
        />
      </div>
    </div>
  );
}

function SocialCircleRankBadge({
  rank,
  mode,
  large = false,
}: {
  rank: number;
  mode: SocialCircleRankMode;
  large?: boolean;
}) {
  const display = getSocialCircleRankDisplay(rank, mode);

  return (
    <span
      aria-hidden='true'
      className={`xhunt-social-circle-rank-badge ${large ? 'large' : ''} ${display.value.length >= 6 ? 'long' : ''}`}
    >
      {display.tier === 'plain' ? (
        <span>{display.icon}</span>
      ) : (
        <span
          className={`xhunt-social-circle-rank-icon ${display.tier}-trophy`}
        >
          {display.icon}
        </span>
      )}
      <span>{display.value}</span>
    </span>
  );
}

export default function SocialCircleGraph({
  data,
  ranks,
  avatarRankMode,
  imageUrl,
  t,
  onNavigate,
}: {
  data: KolInteractionsData;
  ranks: SocialCircleRankMap;
  avatarRankMode: SocialCircleRankMode;
  imageUrl: string;
  t: Translate;
  onNavigate: () => void;
}) {
  const layout = useMemo(() => createSocialCircleLayout(data.items), [data]);
  const [activeRank, setActiveRank] = useState<number | null>(null);
  const activeNode = layout.find((node) => node.rank === activeRank) || null;
  const centerRank = getSocialCircleRank(ranks, data.kol.username);

  const navigateToProfile = (node: SocialCircleLayoutNode) => {
    const username = getSafeUsername(node.item.kol.username);
    if (!username) return;
    navigateInX(`https://x.com/${username}`);
    onNavigate();
  };

  return (
    <div className='relative mx-auto aspect-square w-[min(100%,416px,calc(100dvh-220px))] overflow-visible'>
      <img
        src={imageUrl}
        alt=''
        draggable={false}
        className='absolute inset-0 h-full w-full'
      />

      <div
        aria-hidden='true'
        className='pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full'
        style={{
          left: '50%',
          top: '50%',
          width: `${(SOCIAL_CIRCLE_CENTER_SIZE / SOCIAL_CIRCLE_VIEWBOX_SIZE) * 100}%`,
          height: `${(SOCIAL_CIRCLE_CENTER_SIZE / SOCIAL_CIRCLE_VIEWBOX_SIZE) * 100}%`,
        }}
      >
        <span className='absolute inset-[2%] overflow-hidden rounded-full'>
          <CircleAvatar
            avatar={data.kol.avatar}
            name={data.kol.name}
            username={data.kol.username}
          />
        </span>
        {centerRank && (
          <SocialCircleRankBadge
            rank={centerRank}
            mode={avatarRankMode}
            large
          />
        )}
      </div>

      {layout.map((node) => {
        const username = getSafeUsername(node.item.kol.username);
        const rank = getSocialCircleRank(ranks, username);
        const accessibleLabel = replaceTokens(
          rank
            ? t(
                'socialCircleRankedNodeLabel',
                '@{username}, rank {rank}, mutual interaction score {score}',
              )
            : t(
                'socialCircleNodeLabel',
                '@{username}, mutual interaction score {score}',
              ),
          {
            username:
              username ||
              node.item.kol.name ||
              t('socialCircleUnknownUser', 'Unknown user'),
            rank: rank || '',
            score: node.item.score,
          },
        );

        return (
          <button
            key={`${node.item.kol.user_id}:${node.rank}`}
            type='button'
            aria-label={accessibleLabel}
            aria-disabled={!username}
            className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full outline-none hover:ring-2 hover:ring-sky-400 focus-visible:ring-2 focus-visible:ring-sky-400 ${username ? 'cursor-pointer' : 'cursor-default'}`}
            style={{
              left: `${node.x / 10}%`,
              top: `${node.y / 10}%`,
              width: `${node.size / 10}%`,
              height: `${node.size / 10}%`,
            }}
            onMouseEnter={() => setActiveRank(node.rank)}
            onMouseLeave={() => setActiveRank(null)}
            onFocus={() => setActiveRank(node.rank)}
            onBlur={() => setActiveRank(null)}
            onClick={() => navigateToProfile(node)}
          >
            <span
              aria-hidden='true'
              className='pointer-events-none absolute inset-[4%] overflow-hidden rounded-full'
            >
              <CircleAvatar
                avatar={node.item.kol.avatar}
                name={node.item.kol.name}
                username={node.item.kol.username}
              />
            </span>
            {rank && (
              <SocialCircleRankBadge rank={rank} mode={avatarRankMode} />
            )}
          </button>
        );
      })}

      {activeNode && (
        <SocialCircleTooltip node={activeNode} data={data} t={t} />
      )}
    </div>
  );
}
