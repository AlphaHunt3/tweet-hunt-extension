import cssText from 'data-text:~/css/style.css'
import useShadowContainer from '~contents/hooks/useShadowContainer.ts';
import ReactDOM from 'react-dom';
import { HoverStatItem } from '~contents/compontents/HoverStatItem.tsx';
import { MainData } from '~contents/hooks/useMainData.ts';
import React from 'react';
import { DeletedTweetsSection } from '~contents/compontents/DeletedTweetsSection.tsx';
import { TokenPerformanceSection } from '~contents/compontents/TokenPerformanceSection.tsx';
import { formatPercentage } from '~contents/utils';
import { renderInvestorList } from '~contents/compontents/InvestmentPanel.tsx';
import { useI18n } from '~contents/hooks/i18n.ts';

export function NameRightData({ twInfo, deletedTweets, loadingTwInfo, loadingDel, error, userId, rootData }: MainData) {
  const shadowRoot = useShadowContainer({
    selector: 'div[data-testid="UserName"]',
    styleText: cssText,
  });
  const { t } = useI18n();
  if (!shadowRoot) return null;

  if (error || !userId || !twInfo) {
    return <></>
  }
  const isPerson = twInfo?.basicInfo?.classification === 'person';
  const isKol = twInfo?.basicInfo?.isKol;
  const day90TokenMentionsLength = String(twInfo?.kolTokenMention?.day90?.tokenMentions?.length);
  const day90NowProfitAvg = twInfo?.kolTokenMention?.day90?.nowProfitAvg;
  const day90NowProfitAvgStr = (day90NowProfitAvg >= 0 ? '+' : '') + formatPercentage(day90NowProfitAvg)
  return ReactDOM.createPortal(
    <div className="flex flex-wrap items-center w-full mh-[40px] h-auto mt-4">
      {!loadingTwInfo ? <>
        {/*投资人*/}
        {rootData && rootData?.invested?.investors?.length ?
          <HoverStatItem label={t("investors")} value={`(${rootData?.invested?.investors?.length})`} hoverContent={renderInvestorList(t("investors"), rootData.invested.investors, rootData.invested.total_funding)} valueClassName={'text-[#1D9BF0]'} /> : null
        }
        {rootData && rootData?.investor?.investors?.length ?
          <HoverStatItem label={t("portfolio")} value={`(${rootData?.investor?.investors?.length})`} hoverContent={renderInvestorList(t("portfolio"), rootData.investor.investors, rootData.investor.total_funding)} valueClassName={'text-[#1D9BF0]'} /> : null
        }
        {/*90d谈及代币*/}
        {isPerson && Number(day90TokenMentionsLength) ?
          <HoverStatItem label={t("90dMention")} value={`(${day90TokenMentionsLength})`} hoverContent={
            <TokenPerformanceSection kolData={twInfo} defaultPeriod={'day90'} mode={'WordCloud'} />} valueClassName={'text-[#1D9BF0]'} /> : null}

        {/*90d收益率*/}
        {isPerson && day90NowProfitAvg ?
          <HoverStatItem label={t("90dPerformance")} value={`(${day90NowProfitAvgStr})`} hoverContent={
            <TokenPerformanceSection kolData={twInfo} defaultPeriod={'day90'} mode={'Metrics'} />} valueClassName={day90NowProfitAvg >= 0 ? 'text-green-400' : 'text-red-400'} /> : null}

      </> : <HoverStatItem label={t("loading")} value={''} hoverContent={null} valueClassName={'text-[#1D9BF0]'} />}

      {/*删帖*/}
      {isKol && !loadingDel && deletedTweets && deletedTweets?.length ?
        <HoverStatItem label={t("delInfo")} value={`(${String(deletedTweets?.length)})`} hoverContent={
          <DeletedTweetsSection isHoverPanel={true} deletedTweets={deletedTweets} loadingDel={loadingDel} />
        } valueClassName="text-red-400" /> : null}
    </div>,
    shadowRoot
  );
}
