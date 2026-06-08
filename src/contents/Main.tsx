import React, { useCallback } from 'react';
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
import { AiAnalysisTips } from '~compontents/AiAnalysisTips.tsx';
import { SearchBottomPanel } from '~compontents/area/SearchBottomPanel.tsx';
import { useAvatarRanks } from '~contents/hooks/useAvatarRanks.ts';
import { GlobalInjector } from '~compontents/area/GlobalInjector.tsx';
import { UICheckSection } from '~compontents/UICheckSection.tsx';
import { useSystemInitialization } from '~contents/hooks/useSystemInitialization.ts';
import TweetDetailButton from '~compontents/area/TweetDetailButton.tsx';
import ArticleBottomRightArea from '~compontents/area/ArticleBottomRightArea.tsx';
import GhostFollowingPanel from '~compontents/area/GhostFollowingPanel.tsx';
import useThemeWatcher from '~contents/hooks/useThemeWatcher.ts';
import useOpenSettingsHandler from '~contents/hooks/useOpenSettingsHandler.ts';
import useInitialStateScript from '~contents/hooks/useInitialStateScript.ts';
import SoundPlayer from '~compontents/area/SoundPlayer.tsx';
import { LeaderProvider } from '~contents/contexts/LeaderContext.tsx';
import RealtimeNotification from '~compontents/RealtimeNotification.tsx';
import ArticleBoostPanel from '~compontents/ArticleBoostPanel.tsx';
import FanTipPanel from '~compontents/FanTipPanel.tsx';
import { PlacementTrackingProvider } from '~contents/contexts/PlacementTrackingContext.tsx';
import {
  MainDataProvider,
  useMainDataContext,
} from '~contents/contexts/MainDataContext.tsx';
import { useAvatarSkinInitializer } from '~contents/hooks/useAvatarSkin.ts';
import { useSupportedTokens } from '~contents/hooks/useSupportedTokens.ts';
import {
  ComposeModalDetectButton,
  InlineReplyDetectButton,
  HomeTimelineDetectButton,
} from '~compontents/area/ComposeModalDetectButton.tsx';
import { AiDetectTips } from '~compontents/AiDetectTips.tsx';
import { KolAiChatButton } from '~compontents/area/KolAiChatButton.tsx';
import { KolAiChatDialog } from '~compontents/KolAiChatDialog.tsx';
import useUserDomain from './hooks/useUserDomain.ts';
import UserDomainSetupModal from '~compontents/UserDomainSetupModal.tsx';
import {
  useUserDomain as useUserDomainHook,
  type UserDomainPreference,
} from './hooks/useUserDomain.ts';

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
    'dark',
  );
  const [token, , { isLoading: isTokenStoreLoading }] = useLocalStorage(
    '@xhunt/token',
    '',
  );
  const [language, , { isLoading: isLanguageStoreLoading }] = useLocalStorage(
    '@settings/language1',
    '',
  );
  // 初始化皮肤样式
  const { avatarRankMode, isLoading: isAvatarSkinLoading } =
    useAvatarSkinInitializer();
  // Early guard: do not run hooks/components on non-x.com pages
  if (
    typeof window !== 'undefined' &&
    !window.location.href.includes('x.com')
  ) {
    return <></>;
  } else {
    window._xhunt_language = language;
  }

  // 页面未就绪时，不渲染任何内容
  if (
    !isPageReady ||
    isThemeStoreLoading ||
    isAvatarSkinLoading ||
    isTokenStoreLoading ||
    isLanguageStoreLoading
  ) {
    return <></>;
  }

  return (
    <PlacementTrackingProvider>
      <MainDataProvider>
        <LeaderProvider>
          <MainContent
            theme={theme}
            avatarRankMode={avatarRankMode}
            token={token}
          />
        </LeaderProvider>
      </MainDataProvider>
    </PlacementTrackingProvider>
  );
};

// 内部组件，可以安全使用 useLeader
function MainContent({
  theme,
  avatarRankMode,
  token,
}: {
  theme: string;
  avatarRankMode: 'web3' | 'ai';
  token: string;
}) {
  usePresencePort();
  useSystemInitialization();
  useThemeWatcher();
  usePlacementTrackingClick();
  useVerifyLoginStatus();
  useTwitterAuthCallback();
  const { isSetupCompleted, isSetupLoading } = useUserDomainHook();

  return (
    <div
      data-theme={theme}
      data-xhunt-avatar-rank-mode={avatarRankMode}
      data-xhunt-exclude={'true'}
      key={`${theme}-${avatarRankMode}-${token}-main-content`}
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

      <ErrorBoundary name='SideBarIcon'>
        <SideBarIcon />
      </ErrorBoundary>

      <ErrorBoundary name='GlobalTips'>
        <GlobalTips />
      </ErrorBoundary>

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

      {!isSetupLoading && (
        <>
          {!isSetupCompleted && <UserDomainSetupWrapper />}
          {isSetupCompleted && <FeatureLayer />}
        </>
      )}
    </div>
  );
}

// 仅在用户完成领域选择后渲染的功能层（含对应的 hooks）
function FeatureLayer() {
  const mainData = useMainDataContext();
  useTokenHighlightLayer();
  useAvatarRanks();
  useOpenSettingsHandler();
  useInitialStateScript();

  return (
    <>
      <ErrorBoundary name='FixedTwitterPanel'>
        <FixedTwitterPanel
          twInfo={mainData.twInfo}
          deletedTweets={mainData.deletedTweets}
          loadingTwInfo={mainData.loadingTwInfo}
          loadingDel={mainData.loadingDel}
          error={mainData.error}
          userId={mainData.userId}
          rootData={mainData.rootData}
          loadingRootData={mainData.loadingRootData}
          reviewInfo={mainData.reviewInfo}
          userInfo={mainData.userInfo}
          projectMemberData={mainData.projectMemberData}
          loadingProjectMember={mainData.loadingProjectMember}
        />
      </ErrorBoundary>

      <ErrorBoundary name='NameRightData'>
        <NameRightData
          newTwitterData={mainData.newTwitterData}
          twInfo={mainData.twInfo}
          deletedTweets={mainData.deletedTweets}
          loadingTwInfo={mainData.loadingTwInfo}
          loadingDel={mainData.loadingDel}
          error={mainData.error}
          rootData={mainData.rootData}
          loadingRootData={mainData.loadingRootData}
          renameInfo={mainData.renameInfo}
          reviewInfo={mainData.reviewInfo}
          loadingRenameInfo={mainData.loadingRenameInfo}
          discussionInfo={mainData.discussionInfo}
          loadingDiscussionInfo={mainData.loadingDiscussionInfo}
          projectMemberData={mainData.projectMemberData}
          loadingProjectMember={mainData.loadingProjectMember}
        />
      </ErrorBoundary>

      <ErrorBoundary name='FollowedRightData'>
        <FollowedRightData
          twInfo={mainData.twInfo}
          error={mainData.error}
          userId={mainData.userId}
          loadingTwInfo={mainData.loadingTwInfo}
          reviewInfo={mainData.reviewInfo}
          refreshAsyncReviewInfo={mainData.refreshAsyncReviewInfo}
          refreshAsyncUserInfo={mainData.refreshAsyncUserInfo}
          loadingReviewInfo={mainData.loadingReviewInfo}
        />
      </ErrorBoundary>

      <ErrorBoundary name='TickerTips'>
        <TickerTips />
      </ErrorBoundary>

      <ErrorBoundary name='SearchBottomPanel'>
        <SearchBottomPanel
          error={mainData.error}
          newTwitterData={mainData.newTwitterData}
          loadingTwInfo={mainData.loadingTwInfo}
        />
      </ErrorBoundary>

      <ErrorBoundary name='AiAnalysisTips'>
        <AiAnalysisTips />
      </ErrorBoundary>

      <ErrorBoundary name='TweetDetailButton'>
        <TweetDetailButton />
      </ErrorBoundary>

      <ErrorBoundary name='ArticleBottomRightArea'>
        <ArticleBottomRightArea />
      </ErrorBoundary>

      <ErrorBoundary name='ArticleBoostPanel'>
        <ArticleBoostPanel />
      </ErrorBoundary>

      <ErrorBoundary name='FanTipPanel'>
        <FanTipPanel />
      </ErrorBoundary>

      <ErrorBoundary name='GhostFollowingPanel'>
        <GhostFollowingPanel />
      </ErrorBoundary>

      <ErrorBoundary name='KolAiChatButton'>
        <KolAiChatButton />
      </ErrorBoundary>

      <ErrorBoundary name='KolAiChatDialog'>
        <KolAiChatDialog />
      </ErrorBoundary>

      <ErrorBoundary name='ComposeModal-InlineReply-HomeTimeline-Detect'>
        <ComposeModalDetectButton />
        <InlineReplyDetectButton />
        <HomeTimelineDetectButton />
      </ErrorBoundary>

      <ErrorBoundary name='AiDetectTips'>
        <AiDetectTips />
      </ErrorBoundary>
    </>
  );
}

function useTokenHighlightLayer() {
  const { supportedTokens } = useSupportedTokens();
  useHighlightTokens(supportedTokens);
}

// 用户领域设置弹框包装组件
function UserDomainSetupWrapper() {
  const { shouldShowSetup, completeSetup, setShouldShowSetup } =
    useUserDomain();
  const [, setAvatarRankMode] = useLocalStorage<'web3' | 'ai'>(
    '@settings/avatarRankMode',
    'web3',
  );

  const handleComplete = useCallback(
    (preference: UserDomainPreference) => {
      // 先同步头像排名模式，确保 FeatureLayer 渲染时 useAvatarRanks 能读到新值
      setAvatarRankMode(preference.primaryDomain === 'ai' ? 'ai' : 'web3');
      // 在下一帧再标记领域设置完成，给 storage/state 更新留出时间
      requestAnimationFrame(() => {
        completeSetup(preference);
      });
    },
    [completeSetup, setAvatarRankMode],
  );

  return (
    <ErrorBoundary name='UserDomainSetupModal'>
      <UserDomainSetupModal
        isOpen={shouldShowSetup}
        onComplete={handleComplete}
        onClose={() => setShouldShowSetup(false)}
      />
    </ErrorBoundary>
  );
}

export default Main;
