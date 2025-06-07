import cssText from 'data-text:~/css/style.css'
import useShadowContainer from '~contents/hooks/useShadowContainer.ts';
import ReactDOM from 'react-dom';
import { HoverStatItem } from '~/compontents/HoverStatItem.tsx';
import { MainData } from '~contents/hooks/useMainData.ts';
import React, { useMemo } from 'react';
import { DeletedTweetsSection } from '~/compontents/DeletedTweetsSection.tsx';
import { TokenPerformanceSection } from '~/compontents/TokenPerformanceSection.tsx';
import { formatFunding, formatPercentage, getMBTIColor } from '~contents/utils';
import { renderInvestorList } from '~/compontents/InvestmentPanel.tsx';
import { useI18n } from '~contents/hooks/i18n.ts';
import { NameHistorySection } from '~/compontents/NameHistorySection.tsx';
import { MBTISection } from '~/compontents/MBTISection.tsx';
import { DiscussionSection } from '~/compontents/DiscussionSection.tsx';
import { MBTIData } from '~types';

function _NameRightData({ twInfo, deletedTweets, loadingTwInfo, loadingDel, error, userId, rootData, loadingRootData, renameInfo, loadingRenameInfo, discussionInfo, loadingDiscussionInfo }: MainData) {
  const shadowRoot = useShadowContainer({
    selector: 'div[data-testid="UserName"]',
    styleText: cssText,
  });
  const { t, lang } = useI18n();
  const mbti = useMemo(() => {
    if (Array.isArray(twInfo?.mbti?.cn) && Array.isArray(twInfo?.mbti?.en)) {
      return lang === 'zh' ? twInfo?.mbti?.cn?.[0] : twInfo?.mbti?.en?.[0]
    } else {
      return lang === 'zh' ? twInfo?.mbti?.cn : twInfo?.mbti?.en
    }
  }, [lang, twInfo]) as MBTIData;
  const mbtiColor = useMemo(() => {
    if (mbti && 'mbti' in mbti && mbti?.mbti) {
      return getMBTIColor(mbti.mbti);
    }
    return '';
  }, [mbti]);

  if (!shadowRoot) return null;
  if (error || !userId) {
    return <></>
  }
  const isPerson = twInfo?.basicInfo?.classification === 'person';
  const isKol = twInfo?.basicInfo?.isKol;
  const day90TokenMentionsLength = String(twInfo?.kolTokenMention?.day90?.tokenMentions?.length);
  const day90NowProfitAvg = twInfo?.kolTokenMention?.day90?.maxProfitAvg;
  const day90NowProfitAvgStr = (day90NowProfitAvg && day90NowProfitAvg >= 0 ? '+' : '') + formatPercentage(day90NowProfitAvg);

  return ReactDOM.createPortal(
    <>
      <div className={"inline-block"}>在此处实现备注功能</div>
      <div className="flex flex-wrap items-center w-full mh-[40px] h-auto mt-4">
        {!loadingRootData ? <>
          {/*投资人*/}
          {rootData && rootData?.invested?.investors?.length ?
            <HoverStatItem label={t('investors')} value={Number(rootData.invested.total_funding) ?
              <span className="text-green-600">({formatFunding(Number(rootData.invested.total_funding || 0))})</span> :
              <>({rootData?.invested?.investors?.length})</>} hoverContent={renderInvestorList(t('investors'), rootData.invested.investors, rootData.invested.total_funding, true)} valueClassName={'text-[#1D9BF0]'} /> : null
          }
          {rootData && rootData?.investor?.investors?.length ?
            <HoverStatItem label={t('portfolio')} value={`(${rootData?.investor?.investors?.length})`} hoverContent={renderInvestorList(t('portfolio'), rootData.investor.investors, rootData.investor.total_funding, true)} valueClassName={'text-[#1D9BF0]'} /> : null
          }
        </> : null}
        {!loadingTwInfo ? <>
          {/*90d谈及代币*/}
          {isPerson && Number(day90TokenMentionsLength) ?
            <HoverStatItem label={t('90dMention')} value={`(${day90TokenMentionsLength})`} hoverContent={
              <TokenPerformanceSection kolData={twInfo} defaultPeriod={'day90'} mode={'WordCloud'} />} valueClassName={'text-[#1D9BF0]'} /> : null}

          {/*90d收益率*/}
          {isPerson && day90NowProfitAvg ?
            <HoverStatItem label={t('90dPerformance')} value={`(${day90NowProfitAvgStr})`} hoverContent={
              <TokenPerformanceSection kolData={twInfo} defaultPeriod={'day90'} mode={'Metrics'} />} valueClassName={day90NowProfitAvg >= 0 ? 'text-green-600' : 'text-red-400'} /> : null}

        </> : <HoverStatItem label={t('loading')} value={''} hoverContent={null} valueClassName={'text-[#1D9BF0]'} />}

        {/*MBTI*/}
        {!loadingTwInfo && twInfo && twInfo?.mbti &&
			    <HoverStatItem label={t('personalityType')} value={`(${mbti?.mbti})`} hoverContent={
            <MBTISection data={mbti!} />
          } valueClassName={mbtiColor} />}

        {!loadingRenameInfo && renameInfo && renameInfo?.accounts?.length && Object.keys(renameInfo.accounts[0]?.screen_names || {}).length > 1 ?
          <HoverStatItem label={t('renameInfo')} value={`(${String(Object.keys(renameInfo.accounts[0]?.screen_names || {}).length - 1)})`} hoverContent={
            <NameHistorySection data={renameInfo.accounts[0]} />
          } valueClassName="text-indigo-400" /> : null}

        {/*删帖*/}
        {isKol && !loadingDel && deletedTweets && deletedTweets?.length ?
          <HoverStatItem label={t('delInfo')} value={`(${String(deletedTweets?.length)})`} hoverContent={
            <DeletedTweetsSection isHoverPanel={true} deletedTweets={deletedTweets} loadingDel={loadingDel} />
          } valueClassName="text-red-400" /> : null}

        {twInfo?.kolFollow?.isProject && <DiscussionSection
			    userId={userId}
			    discussionInfo={discussionInfo}
			    loadingDiscussionInfo={loadingDiscussionInfo}
		    />}
      </div>
    </>,
    shadowRoot
  );
}

export const NameRightData = React.memo(_NameRightData);
