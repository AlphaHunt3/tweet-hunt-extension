import { useMemo, useState } from 'react';
import { InvestmentPanel } from '~/compontents/InvestmentPanel.tsx';
import { AI_ABILITY_MIN_SCORE, getAbilityModelData, toAbilityList } from '~/utils/abilityModel';
import { useI18n } from '~contents/hooks/i18n';
import { useUserDomain } from '~contents/hooks/useUserDomain';
import { Badge, Meter, SegmentedControl, Tag } from '../primitives';
import { CardHeader, PanelCard, Skeleton } from './PanelSection';
import { useSoulInfo } from './useSoulInfo';

const SOUL_DIMENSIONS = [
  ['profile_analysis', 'profileAnalysis'],
  ['content_analysis', 'contentAnalysis'],
  ['engagement_analysis', 'engagementAnalysis'],
  ['xhunt_analysis', 'xhuntAnalysis'],
  ['kol_interaction', 'kolInteraction'],
] as const;

type Domain = 'web3' | 'ai';

export function soulTone(score: number) {
  if (score >= 80) return 'up' as const;
  if (score >= 60) return 'warn' as const;
  return 'down' as const;
}

interface PortraitViewProps {
  twInfo: any;
  mbti?: { mbti?: string; keyword?: string[]; explanation?: string };
  twitterId?: string | null;
  rootData: any;
}

export function PortraitView({ twInfo, mbti, twitterId, rootData }: PortraitViewProps) {
  const { t, lang } = useI18n();
  const { primaryDomain } = useUserDomain();
  const web3 = useMemo(() => toAbilityList(getAbilityModelData(twInfo?.multiField, lang).abilities), [twInfo, lang]);
  const ai = useMemo(
    () => toAbilityList(getAbilityModelData(twInfo?.multiFieldAi, lang, AI_ABILITY_MIN_SCORE).abilities),
    [twInfo, lang],
  );
  const [picked, setPicked] = useState<Domain | null>(null);
  const preferred = picked ?? (primaryDomain === 'ai' ? 'ai' : 'web3');
  const domain: Domain = preferred === 'ai' ? (ai.length ? 'ai' : 'web3') : web3.length ? 'web3' : 'ai';
  const abilities = (domain === 'ai' ? ai : web3).slice(0, 5);
  const soul = useSoulInfo(twitterId);
  const reason = soul.data ? (lang === 'en' && soul.data.reason_en ? soul.data.reason_en : soul.data.reason) : '';
  const showInvestment =
    rootData && (rootData.invested || rootData.investor) && twInfo?.basicInfo?.classification !== 'person';

  return (
    <div className='flex flex-col soft:gap-2 obsidian:gap-2.5'>
      {mbti?.mbti ? (
        <PanelCard>
          <CardHeader title={t('personalityType')} />
          <p className='font-xh-num text-[28px] font-bold leading-none tracking-[-0.03em] text-xh-accent-fg obsidian:font-medium native:text-[23px] native:font-extrabold'>
            {mbti.mbti}
          </p>
          {mbti.keyword?.length ? (
            <div className='mt-2.5 flex flex-wrap gap-1'>
              {mbti.keyword.map((word) => (
                <Tag key={word}>{word}</Tag>
              ))}
            </div>
          ) : null}
          {mbti.explanation ? (
            <p className='mt-2 text-[12px] leading-[1.55] text-xh-fg-2 native:text-[14px]'>{mbti.explanation}</p>
          ) : null}
        </PanelCard>
      ) : null}

      {web3.length || ai.length ? (
        <PanelCard>
          <CardHeader
            title={t('kolAbilityModel')}
            aside={
              web3.length && ai.length ? (
                <SegmentedControl
                  aria-label={t('panelAbilityDomain')}
                  size='sm'
                  value={domain}
                  onValueChange={setPicked}
                  options={[
                    { value: 'web3', label: 'Web3' },
                    { value: 'ai', label: 'AI' },
                  ]}
                />
              ) : (
                <Badge>{domain === 'ai' ? 'AI' : 'Web3'}</Badge>
              )
            }
          />
          <ul className='flex flex-col gap-2'>
            {abilities.map((ability) => (
              <ScoreRow key={ability.name} label={ability.name} value={ability.score} />
            ))}
          </ul>
        </PanelCard>
      ) : null}

      {soul.loading || soul.data ? (
        <PanelCard>
          <CardHeader
            title={t('soulIndex')}
            aside={soul.data ? <Badge tone={soulTone(Number(soul.data.score))}>{soul.data.score}</Badge> : null}
          />
          {soul.data ? (
            <>
              <ul className='flex flex-col gap-2'>
                {SOUL_DIMENSIONS.map(([key, label]) => (
                  <ScoreRow key={key} label={t(label)} value={Math.round(Number(soul.data[key]) || 0)} wide />
                ))}
              </ul>
              {reason ? (
                <p className='mt-2.5 text-[12px] leading-[1.55] text-xh-fg-2 native:text-[14px]'>{reason}</p>
              ) : null}
            </>
          ) : (
            <div className='flex flex-col gap-2'>
              {SOUL_DIMENSIONS.map(([key]) => (
                <Skeleton key={key} className='h-4' />
              ))}
            </div>
          )}
        </PanelCard>
      ) : null}

      {showInvestment ? <InvestmentPanel data={rootData} classicStyle /> : null}
    </div>
  );
}

function ScoreRow({ label, value, wide = false }: { label: string; value: number; wide?: boolean }) {
  return (
    <li
      className={
        wide
          ? 'grid grid-cols-[minmax(0,6.5rem)_1fr_28px] items-center gap-2 text-[12px] native:text-[13px]'
          : 'grid grid-cols-[minmax(0,4.5rem)_1fr_28px] items-center gap-2 text-[12px] native:text-[13px]'
      }
    >
      <span className='truncate text-xh-fg-2' title={label}>
        {label}
      </span>
      <Meter label={label} value={value} />
      <b className='text-right font-xh-num font-semibold tabular-nums'>{value}</b>
    </li>
  );
}
