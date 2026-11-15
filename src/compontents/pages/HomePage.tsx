import React, { useMemo, useEffect, useRef } from 'react';
import { useI18n } from '~contents/hooks/i18n.ts';
import usePlacementTracking from '~contents/hooks/usePlacementTracking';
import { Loader2 } from 'lucide-react';
import { KolData, DeletedTweet, InvestmentData } from '~types';
import { MBTIData } from '~types';
import { ReviewStats } from '~types/review';
import { messageManager } from '~/utils/messageManager';
import { HomeChrome } from '~/ui/shells/HomeChrome';
import type { HomeView } from '~/ui/shells/panelNav';
import { usePanelHomeView } from '~/ui/shells/usePanelHomeView';
import { FollowersView } from '~/ui/panel/FollowersView';
import { OverviewView } from '~/ui/panel/OverviewView';
import { PortraitView } from '~/ui/panel/PortraitView';
import { ReviewsView } from '~/ui/panel/ReviewsView';

interface HomePageProps {
  twInfo?: KolData | null;
  deletedTweets?: DeletedTweet[];
  loadingTwInfo?: boolean;
  loadingDel?: boolean;
  userId?: string;
  rootData?: InvestmentData | null;
  loadingRootData?: boolean;
  reviewInfo?: ReviewStats | null;
  projectMemberData?: any;
  loadingProjectMember?: boolean;
  onClose?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  twInfo = null,
  loadingTwInfo = false,
  userId = '',
  rootData = null,
  loadingRootData = false,
  reviewInfo = null,
  onClose,
}) => {
  const { t, lang } = useI18n();
  const langRef = useRef(lang);
  const { setView } = usePanelHomeView();
  const { twitterId } = usePlacementTracking();

  const mbti = useMemo(() => {
    if (Array.isArray(twInfo?.mbti?.cn) && Array.isArray(twInfo?.mbti?.en)) {
      return lang === 'zh' ? twInfo?.mbti?.cn?.[0] : twInfo?.mbti?.en?.[0];
    } else {
      return lang === 'zh' ? twInfo?.mbti?.cn : twInfo?.mbti?.en;
    }
  }, [lang, twInfo]) as MBTIData | undefined;

  // Update message manager language when user language changes
  useEffect(() => {
    if (lang && lang !== langRef.current) {
      langRef.current = lang;
      messageManager.updateLanguage(lang as 'zh' | 'en');
    }
  }, [lang]);

  // 资料页点评卡和评论翻页会跳到首页的评论区；三套风格都有「点评」视图
  useEffect(() => {
    const onRequest = (event: Event) => {
      const id = (event as CustomEvent<{ props?: { scrollToId?: string } }>).detail?.props?.scrollToId;
      if (id === 'panel-scroll-comments' || id === 'panel-scroll-reviews') setView('reviews');
    };
    window.addEventListener('xhunt:route-request', onRequest);
    return () => window.removeEventListener('xhunt:route-request', onRequest);
  }, [setView]);

  const sections = (view: HomeView) => {
    if (loadingTwInfo) {
      return (
        <div className='flex min-h-[240px] flex-col items-center justify-center gap-2 text-xh-fg-2'>
          <Loader2 className='h-6 w-6 animate-spin' />
          <p className='text-sm'>{t('loading')}</p>
        </div>
      );
    }
    const investment = loadingRootData ? null : rootData;
    if (view === 'followers') return <FollowersView twInfo={twInfo} />;
    if (view === 'portrait') {
      return <PortraitView twInfo={twInfo} mbti={mbti} twitterId={twitterId} rootData={investment} />;
    }
    if (view === 'reviews') return <ReviewsView key={userId} stats={reviewInfo} userId={userId} />;
    return (
      <OverviewView
        twInfo={twInfo}
        mbti={mbti}
        stats={reviewInfo}
        twitterId={twitterId}
        rootData={investment}
        onOpen={setView}
      />
    );
  };

  return (
    <HomeChrome userId={userId} twInfo={twInfo} onClose={onClose}>
      {sections}
    </HomeChrome>
  );
};
