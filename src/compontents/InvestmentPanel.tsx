import { Briefcase, Building2 } from 'lucide-react';
import { InvestmentData, Investor } from '~types';
import { useI18n } from '~contents/hooks/i18n.ts';
import { formatFunding } from '~contents/utils';

interface InvestmentPanelProps {
  data: InvestmentData;
}

export const renderInvestorList = (
  title: string,
  investors: Investor[],
  totalFunding: string | number | undefined,
  projectLink: string | undefined,
  showLogo: boolean = false
) => (
  <div className='space-y-2'>
    <div className='flex items-center justify-between'>
      <div className='flex items-center gap-2'>
        {title === 'Investment' ? (
          <Building2 className='w-4 h-4 text-blue-400' />
        ) : (
          <Briefcase className='w-4 h-4 text-blue-400' />
        )}
        <h3 className='text-sm font-medium'>
          {title}{' '}
          {Number(totalFunding) ? (
            <span className='text-xs font-medium text-green-600'>
              {formatFunding(Number(totalFunding || 0))}
            </span>
          ) : (
            <>({investors.length})</>
          )}
        </h3>
      </div>
      {showLogo && (
        <a
          target={'_blank'}
          href={projectLink}
          className='flex cursor-pointer items-center gap-1 px-2 py-1 rounded-full'
        >
          <span className='text-[10px] text-orange-400/80 hover:underline'>
            来源
          </span>
          <img
            src='https://oaewcvliegq6wyvp.public.blob.vercel-storage.com/rootdata-orange.png'
            alt='root-data'
            className='h-[24px] w-auto object-contain'
          />
        </a>
      )}
    </div>
    <div className='max-h-[94px] overflow-y-auto custom-scrollbar'>
      <div className='grid grid-cols-2 gap-2 py-2'>
        {investors
          .sort((a, b) => Number(b?.lead_investor) - Number(a?.lead_investor))
          .map((investor, index) => (
            <div key={index} className='flex items-center gap-2 group'>
              <div className='relative mx-1'>
                {investor.avatar ? (
                  <img
                    src={investor.avatar}
                    alt={investor.name}
                    className='w-6 h-6 rounded-full transition-all group-hover:ring-2 group-hover:ring-blue-400'
                    onError={(e) => {
                      const imgEl = e.currentTarget;
                      const fallbackEl =
                        imgEl.nextElementSibling as HTMLElement | null;
                      imgEl.style.display = 'none';
                      if (fallbackEl) fallbackEl.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div
                  className={`w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium ${
                    investor.avatar ? 'hidden' : ''
                  }`}
                >
                  {investor.name?.charAt(0).toUpperCase() || '?'}
                </div>
                {investor.lead_investor && (
                  <div className='absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-[#1a2634]' />
                )}
              </div>
              <div className='flex-1 min-w-0 overflow-hidden'>
                {investor.twitter ? (
                  <a
                    href={investor.twitter}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-xs truncate hover:underline'
                  >
                    {investor.name}
                  </a>
                ) : (
                  <span className='text-xs cursor-pointer truncate hover:text-gray-300'>
                    {investor.name}
                  </span>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  </div>
);

export function InvestmentPanel({ data }: InvestmentPanelProps) {
  const { t } = useI18n();
  return (
    <div className='p-3 space-y-4'>
      {data.invested.investors.length > 0 &&
        renderInvestorList(
          t('investors'),
          data.invested.investors,
          data?.invested?.total_funding,
          data.projectLink
        )}
      {data.investor.investors.length > 0 && (
        <>
          {renderInvestorList(
            t('portfolio'),
            data.investor.investors,
            data?.investor?.total_funding,
            data.projectLink
          )}
        </>
      )}
    </div>
  );
}
