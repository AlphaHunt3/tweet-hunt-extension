import React, { useEffect, useState } from 'react'
import { GripVertical, Loader2, Tags } from 'lucide-react';
import { useDebounceEffect, useDebounceFn, useLockFn } from 'ahooks'
import cssText from 'data-text:~/css/style.css'
import tipCss from 'data-text:~/css/tippy.css'
import scaleCss from 'data-text:~/css/scale.css'
import { fetchDelTwitterInfo, fetchTwitterInfo } from './services/api'
import { DraggablePanel } from '~contents/compontents/DraggablePanel.tsx';
import { useStorage } from '@plasmohq/storage/hook'
import { extractUsernameFromUrl } from '~contents/utils';
import { useI18n } from '~contents/hooks/i18n.ts';
import { TokenPerformanceSection } from '~contents/compontents/TokenPerformanceSection.tsx';
import { KolData } from '~types';
import { KolFollowersSection } from '~contents/compontents/KolFollowersSection.tsx';
import { DeletedTweetsSection } from '~contents/compontents/DeletedTweetsSection.tsx';

export const config = {
  matches: ['https://x.com/*']
}

export const getStyle = () => {
  const style = document.createElement('style')
  style.textContent = cssText + tipCss + scaleCss;
  return style
}

function TwitterPanel() {
  const [showPanel] = useStorage('@settings/showPanel', true);
  // const [showDeletedTweets] = useStorage('@settings/showDeletedTweets', true);
  const [userId, setUserId] = useState('');
  const [deletedTweets, setDeletedTweets] = useState([]);
  const [userStats, setUserStats] = useState<KolData>(null);
  const [loading, setLoading] = useState(true)
  const [loadingDel, setLoadingDel] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUrl, setCurrentUrl] = useState(window.location.href)
  const { t } = useI18n();
  const { run: fetchDelData } = useDebounceFn(async () => {
    try {
      if (!userId || String(userId) <= 4) return;
      setLoadingDel(true);
      setError(null);
      const [{ value: deletedAry }] = await Promise.allSettled([
        fetchDelTwitterInfo(userId),
      ]);
      setDeletedTweets(deletedAry);
    } catch (err) {
      // setError(err instanceof Error ? err.message : '获取数据失败')
    } finally {
      setLoadingDel(false)
    }
  }, {
    leading: true,
    trailing: false,
    wait: 1000
  })

  const loadData = useLockFn(async () => {
    try {
      if (!userId || String(userId) <= 4) return;
      setLoading(true);
      setError(null);
      fetchDelData().then(r => r);
      const [{ value: userStats }] = await Promise.allSettled([
        fetchTwitterInfo(userId),
      ]);
      setUserStats(userStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取数据失败')
    } finally {
      setLoading(false)
    }
  });

  useEffect(() => {
    loadData().then(r => r);
  }, [userId]);
  useDebounceEffect(() => {
    const uid = extractUsernameFromUrl(currentUrl);
    setUserId(uid);
  }, [currentUrl], { wait: 500 })

  useEffect(() => {
    // 使用 MutationObserver 监听 URL 变化
    const observer = new MutationObserver(() => {
      const newUrl = window.location.href
      if (newUrl !== currentUrl) {
        setCurrentUrl(newUrl)
      }
    })

    observer.observe(document, { subtree: true, childList: true })

    return () => {
      observer.disconnect()
    }
  }, [currentUrl])

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
    <div className="fixed w-[320px]">
      {/* Panel Content */}
      {<div
        className={`absolute top-0 right-0 w-full bg-[#15202b] rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.15)] text-white overflow-hidden opacity-100 shadow-[0_8px_24px_rgba(0,0,0,0.25)]`}
      >
        {loading && (
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
          </div>
          <div className="p-3 pt-2">
            <h1 className="text-sm font-semibold pl-1">
              {`@${userId}`}
              {userStats?.basicInfo?.isKol && <Tags className="w-4 h-4 ml-4 mb-0.5 text-gray-400 inline-flex" />}
              {userStats?.basicInfo?.classification && (userStats?.basicInfo?.classification !== 'unknown') &&
								<span className="text-xs text-gray-400 ml-1">{userStats?.basicInfo?.classification}</span>}
            </h1>
          </div>
        </div>

        <div className="max-h-[90vh] overflow-y-auto overflow-x-hidden custom-scrollbar">
          {/* KOL Followers Section */}
          <KolFollowersSection kolData={userStats} />

          {/*Token Performance Section*/}
          {userStats?.basicInfo?.classification === 'person' && userStats.kolTokenMention &&
						<TokenPerformanceSection kolData={userStats} />}

          {/* Deleted Tweets Section */}
          {(userStats?.basicInfo?.isKol || deletedTweets?.length) ?
            <DeletedTweetsSection deletedTweets={deletedTweets} loadingDel={loadingDel} /> : null}
        </div>
      </div>}

    </div>
  </DraggablePanel>
}

export default TwitterPanel
