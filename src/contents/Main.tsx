import React from 'react';
import usePresencePort from './hooks/usePresencePort.ts';
import usePlacementTrackingClick from '~contents/hooks/usePlacementTrackingClick.ts';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { usePageReady } from './hooks/usePageReady.ts';
import cssText from 'data-text:~/css/style.css';
import { FixedTwitterPanel } from '~compontents/area/FixedTwitterPanel.tsx';
import { NameRightData } from '~compontents/area/NameRightData.tsx';
import { FollowedRightData } from '~compontents/area/FollowedRightData.tsx';
import { SideBarIcon } from '~compontents/area/SideBarIcon.tsx';
import useTwitterAuthCallback from '~contents/hooks/useTwitterAuthCallback.ts';
import { GlobalTips } from '~compontents/area/GlobalTips.tsx';
import ErrorBoundary from '~compontents/ErrorBoundary.tsx';
import { useVerifyLoginStatus } from '~contents/hooks/useVerifyLoginStatus.ts';
import { useHighlightTokens } from '~contents/hooks/useHighlightTokens.ts';
import { TickerTips } from '~compontents/area/TickerTips.tsx';
import { AiAnalysisTips } from '~compontents/area/AiAnalysisTips.tsx';
import { SearchBottomPanel } from '~compontents/area/SearchBottomPanel.tsx';
import { useAvatarRanks } from '~contents/hooks/useAvatarRanks.ts';
import { GlobalInjector } from '~compontents/area/GlobalInjector.tsx';
import useMainData from '~contents/hooks/useMainData.ts';
import { UICheckSection } from '~compontents/UICheckSection.tsx';
import { useSystemInitialization } from '~contents/hooks/useSystemInitialization.ts';
import TweetDetailButton from '~compontents/area/TweetDetailButton.tsx';
import ArticleBottomRightArea from '~compontents/area/ArticleBottomRightArea.tsx';
import useThemeWatcher from '~contents/hooks/useThemeWatcher.ts';
import useOpenSettingsHandler from '~contents/hooks/useOpenSettingsHandler.ts';
import useInitialStateScript from '~contents/hooks/useInitialStateScript.ts';
import SoundPlayer from '~compontents/area/SoundPlayer.tsx';
import { LeaderProvider } from '~contents/contexts/LeaderContext.tsx';
import RealtimeNotification from '~compontents/RealtimeNotification.tsx';
import ArticleBoostPanel from '~compontents/ArticleBoostPanel.tsx';

export const config = {
  matches: ['https://x.com/*'],
};

export const getStyle = () => {
  const style = document.createElement('style');
  style.textContent = cssText;
  return style;
};

const Main = () => {
  // 等待页面加载完成后再初始化插件
  const isPageReady = usePageReady();

  // 所有 hooks 必须在条件返回之前调用（React Hooks 规则）
  const [theme, , { isLoading: isThemeStoreLoading }] = useLocalStorage(
    '@xhunt/theme',
    'dark'
  );
  usePresencePort();
  useSystemInitialization();
  useThemeWatcher();
  usePlacementTrackingClick();
  useVerifyLoginStatus();
  useTwitterAuthCallback();
  const mainData = useMainData();
  useHighlightTokens(mainData.supportedTokens);
  useAvatarRanks();
  useOpenSettingsHandler();
  useInitialStateScript();

  // Early guard: do not run hooks/components on non-x.com pages
  if (
    typeof window !== 'undefined' &&
    !window.location.href.includes('x.com')
  ) {
    return <></>;
  }

  // 页面未就绪时，不渲染任何内容
  if (!isPageReady || isThemeStoreLoading) {
    return <></>;
  }

  return (
    <LeaderProvider>
      <MainContent theme={theme} mainData={mainData} />
    </LeaderProvider>
  );
};

// 内部组件，可以安全使用 useLeader
function MainContent({ theme, mainData }: { theme: string; mainData: any }) {
  return (
    <div
      data-theme={theme}
      data-xhunt-exclude={'true'}
      style={{
        display: 'contents',
      }}
    >
      <GlobalInjector />

      <ErrorBoundary name='SoundPlayerSection'>
        <SoundPlayer />
      </ErrorBoundary>

      <ErrorBoundary name='UICheckSection'>
        <UICheckSection />
      </ErrorBoundary>

      <ErrorBoundary name='FixedTwitterPanel'>
        <FixedTwitterPanel {...mainData} />
      </ErrorBoundary>

      <ErrorBoundary name='NameRightData'>
        <NameRightData {...mainData} />
      </ErrorBoundary>

      <ErrorBoundary name='FollowedRightData'>
        <FollowedRightData {...mainData} />
      </ErrorBoundary>

      <ErrorBoundary name='SideBarIcon'>
        <SideBarIcon />
      </ErrorBoundary>

      <ErrorBoundary name='GlobalTips'>
        <GlobalTips />
      </ErrorBoundary>

      <ErrorBoundary name='TickerTips'>
        <TickerTips />
      </ErrorBoundary>

      <ErrorBoundary name='SearchBottomPanel'>
        <SearchBottomPanel {...mainData} />
      </ErrorBoundary>

      <ErrorBoundary name='AiAnalysisTips'>
        <AiAnalysisTips />
      </ErrorBoundary>

      <ErrorBoundary name='TweetDetailButton'>
        <TweetDetailButton />
      </ErrorBoundary>

      {/*<ErrorBoundary name='ArticleBottomRightArea'>*/}
      {/*  <ArticleBottomRightArea />*/}
      {/*</ErrorBoundary>*/}

      {/*<ErrorBoundary name='ArticleBoostPanel'>*/}
      {/*  <ArticleBoostPanel />*/}
      {/*</ErrorBoundary>*/}

      {/* <ErrorBoundary name='ProfileFollowButtonArea'>
        <ProfileFollowButtonArea {...mainData} />
      </ErrorBoundary>

      <ErrorBoundary name='AiChatDialog'>
        <AiChatDialog />
      </ErrorBoundary> */}

      {/* 实时通知组件 */}
      <ErrorBoundary name='RealtimeNotification'>
        <RealtimeNotification
          getTargetElement={() => {
            const main = document.querySelector('main');
            const firstChild = main?.firstChild;
            return (firstChild as Element) || document.body;
          }}
          offset={{ x: 0, y: 0 }}
        />
      </ErrorBoundary>
    </div>
  );
}

export default Main;
