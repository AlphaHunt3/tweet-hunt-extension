import { useI18n } from '~contents/hooks/i18n';
import { formatFunding } from '~contents/utils';
import { BriefcaseIcon } from '~/ui/icons';
import { Avatar } from '~/ui/primitives/Avatar';
import { DetailCard, DetailEmpty } from './DetailCard';

export interface Investor {
  name?: string;
  avatar?: string;
  twitter?: string;
  lead_investor?: boolean | number | null;
}

export function sortInvestors(list: unknown): Investor[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((item): item is Investor => Boolean(item) && typeof item === 'object')
    .sort((a, b) => Number(Boolean(b.lead_investor)) - Number(Boolean(a.lead_investor)));
}

export function InvestorGrid({ investors, compact = false }: { investors: unknown; compact?: boolean }) {
  const { t } = useI18n();
  return (
    <ul className='xh-investors' data-compact={compact ? '' : undefined}>
      {sortInvestors(investors).map((investor, index) => {
        const name = investor.name || '?';
        const content = (
          <>
            <span className='xh-investor-av'>
              <Avatar name={name} src={investor.avatar} size={compact ? 'xs' : 'sm'} />
              {investor.lead_investor ? <span className='xh-investor-lead' aria-hidden='true' /> : null}
            </span>
            <span className='xh-investor-name'>{name}</span>
            {investor.lead_investor ? <span className='sr-only'>{t('leadInvestor')}</span> : null}
          </>
        );
        return (
          <li key={`${index}-${name}`}>
            {investor.twitter ? (
              <a className='xh-investor' href={investor.twitter} target='_blank' rel='noopener noreferrer'>
                {content}
              </a>
            ) : (
              <span className='xh-investor'>{content}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function fundingText(totalFunding: unknown): string | null {
  const n = Number(totalFunding);
  return Number.isFinite(n) && n > 0 ? formatFunding(n) : null;
}

export interface InvestorsCardProps {
  title: string;
  kind: 'investors' | 'portfolio';
  investors: unknown;
  totalFunding?: string | number | null;
  projectLink?: string | null;
}

export function InvestorsCard({ title, kind, investors, totalFunding, projectLink }: InvestorsCardProps) {
  const { t } = useI18n();
  const list = sortInvestors(investors);
  const funding = fundingText(totalFunding);
  return (
    <DetailCard
      className='xh-investors-card'
      icon={<BriefcaseIcon />}
      title={title}
      subtitle={list.length ? t(kind === 'investors' ? 'investorCount' : 'portfolioCount').replace('{count}', String(list.length)) : undefined}
      aside={funding ? <span className='xh-dscore'>{funding}</span> : null}
      footer={
        projectLink ? (
          <a className='xh-dcard-link' href={projectLink} target='_blank' rel='noopener noreferrer'>
            {t('source')} · RootData
          </a>
        ) : null
      }
    >
      {list.length ? <InvestorGrid investors={list} /> : <DetailEmpty>{t('noData')}</DetailEmpty>}
    </DetailCard>
  );
}
