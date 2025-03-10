import cssText from 'data-text:~/css/style.css'
import useShadowContainer from '~contents/hooks/useShadowContainer.ts';
import { MainData } from '~contents/hooks/useMainData.ts';
import React, { useCallback } from 'react';
import ReactDOM from 'react-dom';
import { HoverStatItem } from '~contents/compontents/HoverStatItem.tsx';
import { formatNumber } from '~contents/utils';
import { KolFollowersSection } from '~contents/compontents/KolFollowersSection.tsx';

const targetFilter = (el: any) => {
  return el.tagName.toLowerCase() === 'div' &&
    el.textContent.includes('Following') &&
    el.textContent.includes('Followers');
};

export function FollowedRightData({ twInfo, error, userId, loadingTwInfo }: MainData) {
  const shadowRoot = useShadowContainer({
    selector: 'div[data-testid="UserName"]',
    styleText: cssText,
    useSiblings: true,
    targetFilter: targetFilter
  });
  if (!shadowRoot) return null;

  if (error || !userId || loadingTwInfo || !twInfo) {
    return <></>
  }
  return ReactDOM.createPortal(<>
    <HoverStatItem label={formatNumber(twInfo?.kolFollow?.globalKolFollowersCount || 0)} value={'KOL Followers'} hoverContent={
      <KolFollowersSection kolData={twInfo} isHoverPanel={true} defaultTab={'global'} />
    } labelClassName={'font-bold'} valueClassName={'text-[#71767A]'} className={'ml-6'} />
    <HoverStatItem label={formatNumber(twInfo?.kolFollow?.topKolFollowersCount || 0)} value={'TOP100 KOLs'} hoverContent={
      <KolFollowersSection kolData={twInfo} isHoverPanel={true} defaultTab={'top100'} />
    } labelClassName={'font-bold'} valueClassName={'text-[#71767A]'} />
    <HoverStatItem label={formatNumber(twInfo?.kolFollow?.cnKolFollowersCount || 0)} value={'CN KOLs'} hoverContent={
      <KolFollowersSection kolData={twInfo} isHoverPanel={true} defaultTab={'cn'} />
    } labelClassName={'font-bold'} valueClassName={'text-[#71767A]'} />
  </>, shadowRoot)
}
