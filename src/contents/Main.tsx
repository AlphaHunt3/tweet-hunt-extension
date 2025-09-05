import { useEffect } from 'react';
import usePlacementTrackingClick from '~contents/hooks/usePlacementTrackingClick.ts';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
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
import useThemeWatcher from '~contents/hooks/useThemeWatcher.ts';
import { ProfileFollowButtonArea } from '~compontents/area/ProfileFollowButtonArea.tsx';
import { AiChatDialog } from '~compontents/area/AiChatDialog.tsx';

export const config = {
  matches: ['https://x.com/*'],
};

export const getStyle = () => {
  const style = document.createElement('style');
  style.textContent = cssText;
  return style;
};

const Main = () => {
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  useSystemInitialization();
  useThemeWatcher();
  usePlacementTrackingClick();
  useVerifyLoginStatus();
  useTwitterAuthCallback();
  const mainData = useMainData();
  useHighlightTokens(mainData.supportedTokens);
  useAvatarRanks();

  if (!mainData.currentUrl.includes('x.com')) return <></>;

  return (
    <div
      data-theme={theme}
      data-xhunt-exclude={'true'}
      style={{
        display: 'contents',
      }}
    >
      <GlobalInjector />

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

      {/* <ErrorBoundary name='ProfileFollowButtonArea'>
        <ProfileFollowButtonArea {...mainData} />
      </ErrorBoundary>

      <ErrorBoundary name='AiChatDialog'>
        <AiChatDialog />
      </ErrorBoundary> */}
    </div>
  );
};

export default Main;
