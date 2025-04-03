import React from 'react'
import { Loader2, Tags, CircleX, GripVertical } from 'lucide-react';
import { DraggablePanel } from '~contents/compontents/DraggablePanel.tsx';
import { useStorage } from '@plasmohq/storage/hook'
import { useI18n } from '~contents/hooks/i18n.ts';
import { TokenPerformanceSection } from '~contents/compontents/TokenPerformanceSection.tsx';
import { KolFollowersSection } from '~contents/compontents/KolFollowersSection.tsx';
import { DeletedTweetsSection } from '~contents/compontents/DeletedTweetsSection.tsx';
import { MainData } from '~contents/hooks/useMainData.ts';
import { InvestmentPanel } from '~contents/compontents/InvestmentPanel.tsx';
import { MBTISection } from '~contents/compontents/MBTISection.tsx';

export function FixedTwitterPanel({ twInfo, deletedTweets, loadingTwInfo, loadingDel, error, userId, rootData, loadingRootData }: MainData) {
  const [showPanel, setShowPanel] = useStorage('@settings/showPanel', true);
  const { t, lang } = useI18n();
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
    <div className="relative w-[320px]" data-key={showPanel}>
      {/* Panel Content */}
      {<div
        className={`absolute top-0 right-0 w-full bg-[#15202b] rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.15)] text-white overflow-hidden opacity-100 shadow-[0_8px_24px_rgba(0,0,0,0.25)]`}
      >
        {loadingTwInfo && (
          <div className="absolute inset-0 bg-[#15202b]/70 backdrop-blur-[3px] z-10 flex flex-col items-center justify-center pointer-events-auto">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-2" />
            <p className="text-sm text-blue-200">{t('loading')}</p>
          </div>
        )}
        {/* Sticky Header */}
        <div className="sticky top-0 z-50 bg-[#15202b]/95 backdrop-blur-sm border-b border-gray-700/50">
          <div className="absolute right-2 top-2 flex items-center gap-1">
            <div className="tw-hunt-drag-handle p-1.5 rounded-full hover:bg-gray-700/50 transition-colors cursor-grab active:cursor-grabbing">
              <GripVertical className="w-4 h-4 text-gray-400" />
            </div>
            <div className="p-1.5 rounded-full hover:bg-gray-700/50 transition-colors cursor-pointer" onClick={() => {
              setShowPanel(false).then(r => r);
            }}>
              <CircleX className="w-4 h-4 text-gray-400" />
            </div>
          </div>
          <div className="p-3 pt-2">
            <h1 className="text-sm font-semibold pl-1">
              {`@${userId}`}
              {twInfo?.basicInfo?.isKol && <Tags className="w-4 h-4 ml-4 mb-0.5 text-gray-400 inline-flex" />}
              {twInfo?.basicInfo?.classification && (twInfo?.basicInfo?.classification !== 'unknown') &&
								<span className="text-xs text-gray-400 ml-1">{twInfo?.basicInfo?.classification}</span>}
            </h1>
          </div>
        </div>

        <div className="max-h-[90vh] overflow-y-auto overflow-x-hidden custom-scrollbar">
          {/* KOL Followers Section */}
          <KolFollowersSection kolData={twInfo!} />

          {twInfo?.mbti?.en && <MBTISection data={lang === 'zh' ? twInfo?.mbti?.cn! : twInfo?.mbti?.en!} />}

          {!loadingRootData && rootData && (rootData?.invested || rootData?.investor) && twInfo?.basicInfo?.classification !== 'person' &&
						<InvestmentPanel data={rootData} />}

          {/*Token Performance Section*/}
          {twInfo?.basicInfo?.classification === 'person' && twInfo.kolTokenMention &&
						<TokenPerformanceSection kolData={twInfo} />}

          {/* Deleted Tweets Section */}
          {(twInfo?.basicInfo?.isKol || deletedTweets?.length) ?
            <DeletedTweetsSection deletedTweets={deletedTweets} loadingDel={loadingDel} /> : null}
        </div>
      </div>}

    </div>
  </DraggablePanel>
}

