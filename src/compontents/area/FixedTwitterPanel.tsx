import { Loader2, Tags, CircleX, GripVertical } from 'lucide-react';
import { DraggablePanel } from '~/compontents/DraggablePanel.tsx';
import { useI18n } from '~contents/hooks/i18n.ts';
import { TokenPerformanceSection } from '~/compontents/TokenPerformanceSection.tsx';
import { KolFollowersSection } from '~/compontents/KolFollowersSection.tsx';
import { DeletedTweetsSection } from '~/compontents/DeletedTweetsSection.tsx';
import { MainData } from '~contents/hooks/useMainData.ts';
import { InvestmentPanel } from '~/compontents/InvestmentPanel.tsx';
import { MBTISection } from '~/compontents/MBTISection.tsx';
import { UserAuthPanel } from '~/compontents/UserAuthPanel.tsx';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ReviewsOverview } from '~compontents/ReviewsOverview.tsx';
import useWaitForElement from '~contents/hooks/useWaitForElement.ts';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { MBTIData } from '~types';

function _FixedTwitterPanel({ twInfo, deletedTweets, loadingTwInfo, loadingDel, error, userId, rootData, loadingRootData, reviewInfo, userInfo }: MainData) {
  const [showPanel, setShowPanel] = useLocalStorage('@settings/showPanel', true);
  const { t, lang } = useI18n();
  const searchInput = useWaitForElement('input[data-testid="SearchBox_Search_Input"]', [showPanel]);
  const [isFocused, setIsFocused] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!searchInput) return;

    const handleFocus = () => {
      blurTimer.current && clearTimeout(blurTimer.current);
      setIsFocused(true);
    };

    const handleBlur = () => {
      blurTimer.current && clearTimeout(blurTimer.current);
      blurTimer.current = setTimeout(() => {
        setIsFocused(false);
      }, 500);
    };

    searchInput.addEventListener('focus', handleFocus);
    searchInput.addEventListener('blur', handleBlur)

    return () => {
      searchInput.removeEventListener('focus', handleFocus);
      searchInput.removeEventListener('blur', handleBlur);
    };
  }, [searchInput]);

  const mbti = useMemo(() => {
    if (Array.isArray(twInfo?.mbti?.cn) && Array.isArray(twInfo?.mbti?.en)) {
      return lang === 'zh' ? twInfo?.mbti?.cn?.[0] : twInfo?.mbti?.en?.[0]
    } else {
      return lang === 'zh' ? twInfo?.mbti?.cn : twInfo?.mbti?.en
    }
  }, [lang, twInfo]) as MBTIData;

  if (!showPanel) {
    return null
  }
  if (error || !userId) {
    return <></>
  }

  return <DraggablePanel
    width={320}
    dragHandleClassName="tw-hunt-drag-handle"
  >
    <div style={{
      opacity: isFocused ? 0 : 1,
      pointerEvents: isFocused ? 'none' : 'auto',
      transition: 'opacity 0.3s ease-in-out'
    }} className="relative w-[320px] max-h-[600px]" data-key={showPanel} data-xhunt-exclude={'true'}>
      {/* Panel Content */}
      {<div
        className={`absolute top-0 right-0 w-full theme-bg-secondary rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.15)] theme-text-primary overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.25)]`}
        style={{
          backgroundColor: 'var(--bg-secondary)'
        }}
      >
        {loadingTwInfo && (
          <div className="absolute inset-0 theme-bg-secondary z-10 flex flex-col items-center justify-center pointer-events-auto">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-2" />
            <p className="text-sm text-blue-200">{t('loading')}</p>
          </div>
        )}
        {/* Sticky Header */}
        <div className="sticky top-0 z-50 theme-bg-secondary theme-border border-b">
          <div className="absolute right-2 top-2 flex items-center gap-1">
            <div className="tw-hunt-drag-handle p-1.5 rounded-full theme-hover cursor-grab active:cursor-grabbing">
              <GripVertical className="w-4 h-4 theme-text-secondary" />
            </div>
            <div className="p-1.5 rounded-full theme-hover transition-colors cursor-pointer" onClick={() => {
              setShowPanel(false).then(r => r);
            }}>
              <CircleX className="w-4 h-4 theme-text-secondary" />
            </div>
          </div>
          {!loadingTwInfo && <div className="p-3 pt-2">
	          <h1 className="text-sm font-semibold pl-1">
              {`@${userId}`}
              {twInfo?.basicInfo?.isKol && <Tags className="w-4 h-4 ml-4 mb-0.5 theme-text-secondary inline-flex" />}
              {twInfo?.basicInfo?.classification && (twInfo?.basicInfo?.classification !== 'unknown') &&
			          <span className="text-xs theme-text-secondary ml-1">{twInfo?.basicInfo?.classification}</span>}
	          </h1>
          </div>}
        </div>

        <div className="max-h-[80vh] overflow-y-auto overflow-x-hidden custom-scrollbar">
          {/* KOL Followers Section */}
          <KolFollowersSection kolData={twInfo!} />

          {mbti && <MBTISection data={mbti} />}

          {!loadingRootData && rootData && (rootData?.invested || rootData?.investor) && twInfo?.basicInfo?.classification !== 'person' &&
						<InvestmentPanel data={rootData} />}

          {/*Token Performance Section*/}
          {twInfo?.basicInfo?.classification === 'person' && twInfo.kolTokenMention &&
						<TokenPerformanceSection kolData={twInfo} />}

          <ReviewsOverview stats={reviewInfo} />

          {/* Deleted Tweets Section */}
          {(twInfo?.basicInfo?.isKol || deletedTweets?.length) ?
            <DeletedTweetsSection deletedTweets={deletedTweets} loadingDel={loadingDel} /> : null}
        </div>

        <UserAuthPanel userInfo={userInfo} />
      </div>}
    </div>
  </DraggablePanel>
}

export const FixedTwitterPanel = React.memo(_FixedTwitterPanel);
