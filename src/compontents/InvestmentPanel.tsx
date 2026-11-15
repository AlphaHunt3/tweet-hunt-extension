import { InvestmentData } from '~types';
import { useI18n } from '~contents/hooks/i18n.ts';
import { fundingText, InvestorGrid, sortInvestors } from '~/ui/profile/details/InvestorsCard';

interface InvestmentPanelProps {
  data: InvestmentData;
  classicStyle?: boolean;
}

function InvestorSection({
  title,
  investors,
  totalFunding,
  compact,
}: {
  title: string;
  investors: unknown;
  totalFunding: unknown;
  compact: boolean;
}) {
  const list = sortInvestors(investors);
  if (!list.length) return null;
  const funding = fundingText(totalFunding);
  return (
    <section className='xh-invest-section'>
      <p className='xh-invest-title'>
        {title}
        <span className='xh-invest-meta'>{funding ?? list.length}</span>
      </p>
      <InvestorGrid investors={list} compact={compact} />
    </section>
  );
}

export function InvestmentPanel({ data, classicStyle = false }: InvestmentPanelProps) {
  const { t } = useI18n();
  return (
    <div className='xh-invest' data-compact={classicStyle ? '' : undefined}>
      <InvestorSection
        title={t('investors')}
        investors={data?.invested?.investors}
        totalFunding={data?.invested?.total_funding}
        compact={classicStyle}
      />
      <InvestorSection
        title={t('portfolio')}
        investors={data?.investor?.investors}
        totalFunding={data?.investor?.total_funding}
        compact={classicStyle}
      />
    </div>
  );
}
