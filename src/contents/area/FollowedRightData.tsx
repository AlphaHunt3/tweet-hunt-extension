import cssText from 'data-text:~/css/style.css'
import useShadowContainer from '~contents/hooks/useShadowContainer.ts';
import { MainData } from '~contents/hooks/useMainData.ts';
import React, { useCallback } from 'react';
import ReactDOM from 'react-dom';
import { HoverStatItem } from '~contents/compontents/HoverStatItem.tsx';
const targetFilter = (el: any) => {
  return el.tagName.toLowerCase() === 'div' &&
    el.textContent.includes('Following') &&
    el.textContent.includes('Followers');
};
export function FollowedRightData({ twInfo, deletedTweets, loadingTwInfo, loadingDel, error, userId }: MainData) {
  const shadowRoot = useShadowContainer({
    selector: 'div[data-testid="UserName"]',
    styleText: cssText,
    useSiblings: true,
    targetFilter: targetFilter
  });
  if (!shadowRoot) return null;

  if (error || !userId) {
    return <></>
  }
  return ReactDOM.createPortal(<>
    <HoverStatItem label={'2k'} value={'KOL Followers'} hoverContent={'33'} labelClassName={"font-bold"} valueClassName={'text-[#71767A]'} className={'ml-6'} />
    <HoverStatItem label={'16'} value={'TOP100 KOLs'} hoverContent={'33'} labelClassName={"font-bold"} valueClassName={'text-[#71767A]'} />
    <HoverStatItem label={'24,312'} value={'CN KOLs'} hoverContent={'33'} labelClassName={"font-bold"} valueClassName={'text-[#71767A]'} />
  </>, shadowRoot)
}
