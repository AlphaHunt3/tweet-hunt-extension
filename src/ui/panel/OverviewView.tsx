import { useMemo, type ReactNode } from 'react';
import { InvestmentPanel } from '~/compontents/InvestmentPanel.tsx';
import { AI_ABILITY_MIN_SCORE, getAbilityModelData, toAbilityList } from '~/utils/abilityModel';
import { useI18n } from '~contents/hooks/i18n';
import { useUserDomain } from '~contents/hooks/useUserDomain';
import { useLocalStorage } from '~storage/useLocalStorage';
import { ChevronRightIcon, StarIcon } from '../icons';
import { Avatar, Badge, RowButton } from '../primitives';
import { cx } from '../primitives/cx';
import { formatCount, formatRank, rankDelta } from '../shells/HomeChrome';
import type { HomeView } from '../shells/panelNav';
import { useUiSkin } from '../skin/useUiSkin';
import { PanelCard } from './PanelSection';
import { REVIEW_ONLY_KOL_KEY, hasReviews, reviewCounts } from './ReviewsView';
import { useSoulInfo } from './useSoulInfo';

interface OverviewViewProps {
  twInfo: any;
  mbti?: { mbti?: string; keyword?: string[] };
  stats: any;
  twitterId?: string | null;
  rootData?: any;
  onOpen: (view: HomeView) => void;
}

type Delta = ReturnType<typeof rankDelta>;

export function OverviewView({ twInfo, mbti, stats, twitterId, rootData, onOpen }: OverviewViewProps) {
  const { t, lang } = useI18n();
  const { skin } = useUiSkin();
  const { primaryDomain } = useUserDomain();
  const [onlyFeatured] = useLocalStorage<boolean>(REVIEW_ONLY_KOL_KEY, true);
  const soul = useSoulInfo(twitterId);
  const kol = twInfo?.kolFollow ?? {};
  const s = primaryDomain === 'ai' ? 'Ai' : '';
  const globalDelta = rankDelta(kol[`kolGlobalRankChange${s}`]);
  const cnDelta = rankDelta(kol[`kolCnRankChange${s}`]);
  const followers: any[] = Array.isArray(kol[`globalKolFollowers${s}`]) ? kol[`globalKolFollowers${s}`] : [];
  const followersCount = formatCount(kol[`globalKolFollowersCount${s}`]);
  const average = Number(stats?.averageRating) || 0;
  const reviewsLine = hasReviews(stats)
    ? `${average.toFixed(1)} · ${reviewCounts(stats, onlyFeatured, t).join(' · ')}`
    : onlyFeatured
      ? t('noSelectedReviews')
      : t('noReviews');
  const keywords = mbti?.keyword?.slice(0, 3).join(' · ');

  if (skin === 'native') {
    return (
      <NativeOverview
        rows={[
          {
            key: 'rank',
            category: `${t('panelGlobalInfluence')} · ${primaryDomain === 'ai' ? 'AI' : 'Web3'}`,
            title: formatRank(kol[`kolGlobalRank${s}`]),
            delta: globalDelta,
            meta: `${t('panelCnInfluence')} ${formatRank(kol[`kolCnRank${s}`])}`,
          },
          soul.data ? { key: 'soul', category: t('soulIndex'), title: String(soul.data.score) } : null,
          {
            key: 'followers',
            category: t('kFollowingAnalytics'),
            title: `${followersCount} KOL`,
            meta: followers
              .slice(0, 3)
              .map((person) => person.name || person.username)
              .join(lang === 'zh' ? '、' : ', '),
            onOpen: () => onOpen('followers'),
          },
          mbti?.mbti ? { key: 'mbti', category: t('personalityType'), title: mbti.mbti, meta: keywords } : null,
          { key: 'reviews', category: t('homeViewReviews'), title: `★ ${reviewsLine}`, onOpen: () => onOpen('reviews') },
        ]}
        twInfo={twInfo}
        primaryDomain={primaryDomain}
        rootData={rootData}
      />
    );
  }

  return (
    <div className='flex flex-col gap-2.5'>
      <dl className='grid grid-cols-2 gap-2'>
        <Stat label={t('panelGlobalInfluence')} value={formatRank(kol[`kolGlobalRank${s}`])} delta={globalDelta} />
        <Stat label={t('soulIndex')} value={soul.data ? String(soul.data.score) : '—'} />
        <Stat label={t('panelKolFollowers')} value={followersCount} />
        <Stat label={t('panelCnInfluence')} value={formatRank(kol[`kolCnRank${s}`])} delta={cnDelta} />
      </dl>
      {followers.length ? (
        <PanelCard flush>
          <ul>
            {followers.slice(0, 3).map((person, index) => (
              <li key={person.username}>
                <a
                  href={`https://x.com/${person.username}`}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='xh-rowbtn rounded-[9px] px-2 py-[7px]'
                >
                  <span className='w-4 shrink-0 text-right font-xh-mono text-[11px] tabular-nums text-xh-fg-2'>
                    {index + 1}
                  </span>
                  <Avatar name={person.name || person.username} src={person.avatar} size='md' />
                  <span className='min-w-0 flex-1 truncate text-[12.5px] font-medium'>{person.name || person.username}</span>
                </a>
              </li>
            ))}
          </ul>
          <RowButton
            onClick={() => onOpen('followers')}
            className='justify-between rounded-[9px] px-2 py-2 text-[12px] text-xh-fg-2 hover:text-xh-fg'
          >
            {t('kFollowingAnalytics')}
            <ChevronRightIcon size={14} />
          </RowButton>
        </PanelCard>
      ) : null}
      {mbti?.mbti ? <Shortcut onClick={() => onOpen('portrait')} title={mbti.mbti} sub={keywords} /> : null}
      <Shortcut
        onClick={() => onOpen('reviews')}
        title={
          <>
            <StarIcon size={13} className='text-[#f2b01e]' />
            {reviewsLine}
          </>
        }
      />
    </div>
  );
}

function Stat({ label, value, delta }: { label: string; value: string; delta?: Delta }) {
  return (
    <div className='xh-rise flex flex-col gap-1 rounded-xh-card bg-xh-raised px-[11px] pb-2 pt-[9px] shadow-xh-card'>
      <div className='flex min-h-5 items-center justify-between gap-1.5'>
        <dt className='truncate text-[11.5px] text-xh-fg-2'>{label}</dt>
        {delta ? <Badge tone={delta.tone}>{delta.text}</Badge> : null}
      </div>
      <dd className='font-xh-num text-[20px] font-medium leading-[1.15] tracking-[-0.03em] tabular-nums'>{value}</dd>
    </div>
  );
}

function Shortcut({ title, sub, onClick }: { title: ReactNode; sub?: string; onClick: () => void }) {
  return (
    <RowButton
      onClick={onClick}
      className='xh-rise rounded-xh-card bg-xh-raised px-3 py-2.5 shadow-xh-card hover:bg-xh-hover'
    >
      <span className='min-w-0 flex-1'>
        <span className='flex items-center gap-1.5 text-[12.5px] font-medium'>{title}</span>
        {sub ? <span className='mt-0.5 block truncate text-[11.5px] text-xh-fg-2'>{sub}</span> : null}
      </span>
      <ChevronRightIcon size={14} className='text-xh-fg-2' />
    </RowButton>
  );
}

interface Row {
  key: string;
  category: string;
  title: string;
  delta?: Delta;
  meta?: string;
  onOpen?: () => void;
}

function NativeOverview({
  rows,
  twInfo,
  primaryDomain,
  rootData,
}: {
  rows: Array<Row | null>;
  twInfo: any;
  primaryDomain: string;
  rootData: any;
}) {
  const { t, lang } = useI18n();
  const abilities = useMemo(() => {
    const web3 = toAbilityList(getAbilityModelData(twInfo?.multiField, lang).abilities);
    const ai = toAbilityList(getAbilityModelData(twInfo?.multiFieldAi, lang, AI_ABILITY_MIN_SCORE).abilities);
    return (primaryDomain === 'ai' && ai.length ? ai : web3.length ? web3 : ai).slice(0, 3);
  }, [twInfo, lang, primaryDomain]);
  const showInvestment =
    rootData && (rootData.invested || rootData.investor) && twInfo?.basicInfo?.classification !== 'person';
  const all: Row[] = rows.filter((row): row is Row => row !== null);
  if (abilities.length) {
    all.splice(all.length - 1, 0, {
      key: 'abilities',
      category: t('kolAbilityModel'),
      title: `${abilities[0].name} ${abilities[0].score}`,
      meta: abilities
        .slice(1)
        .map((ability) => `${ability.name} ${ability.score}`)
        .join(' · '),
    });
  }

  return (
    <div className='flex flex-col'>
      <ul className='border-b border-xh-line py-1'>
        {all.map((row) => (
          <li key={row.key} className='xh-rise'>
            <NativeRow row={row} />
          </li>
        ))}
      </ul>
      {showInvestment ? <InvestmentPanel data={rootData} classicStyle /> : null}
    </div>
  );
}

function NativeRow({ row }: { row: Row }) {
  const body = (
    <>
      <span className='min-w-0 flex-1'>
        <span className='block truncate text-[13px] text-xh-fg-2'>{row.category}</span>
        <span className='flex items-center gap-1.5 text-[15px] font-bold leading-5'>
          {row.title}
          {row.delta ? <Badge tone={row.delta.tone}>{row.delta.text}</Badge> : null}
        </span>
        {row.meta ? <span className='block truncate text-[13px] text-xh-fg-2'>{row.meta}</span> : null}
      </span>
      {row.onOpen ? <ChevronRightIcon size={16} className='shrink-0 text-xh-fg-2' /> : null}
    </>
  );
  const className = 'gap-3 px-4 py-2.5';
  return row.onOpen ? (
    <RowButton onClick={row.onOpen} className={className}>
      {body}
    </RowButton>
  ) : (
    <div className={cx('flex items-center', className)}>{body}</div>
  );
}
