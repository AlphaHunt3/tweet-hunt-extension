import { useLocalStorage } from '~storage/useLocalStorage.ts';
import cssText from 'data-text:~/css/style.css'
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
import { useAvatarRanks } from '~contents/hooks/useAvatarRanks.ts';
import { GlobalInjector } from '~compontents/area/GlobalInjector.tsx';
import useMainData from '~contents/hooks/useMainData.ts';
import { UICheckSection } from '~compontents/UICheckSection.tsx';

export const config = {
  matches: ['https://x.com/*']
}

export const getStyle = () => {
  const style = document.createElement('style')
  style.textContent = cssText;
  return style
}

const Main = () => {
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  useVerifyLoginStatus();
  useTwitterAuthCallback();
  const mainData = useMainData();
  useHighlightTokens(mainData.supportedTokens);
  useAvatarRanks();

  if (!mainData.currentUrl.includes('x.com')) return <></>;
  return (
    <div data-theme={theme} data-xhunt-exclude={'true'} style={{
      display: 'contents',
    }}>
      <GlobalInjector />
      <ErrorBoundary>
        <UICheckSection />
      </ErrorBoundary>

      <ErrorBoundary>
        <FixedTwitterPanel {...mainData} />
      </ErrorBoundary>

      <ErrorBoundary>
        <NameRightData {...mainData} />
      </ErrorBoundary>

      <ErrorBoundary>
        <FollowedRightData {...mainData} />
      </ErrorBoundary>

      <ErrorBoundary>
        <SideBarIcon />
      </ErrorBoundary>

      <ErrorBoundary>
        <GlobalTips />
      </ErrorBoundary>

      <ErrorBoundary>
        <TickerTips />
      </ErrorBoundary>
    </div>
  )
}

export default Main;
