import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useI18n } from '~contents/hooks/i18n.ts';
import { KolFollowersSection } from '~/compontents/KolFollowersSection.tsx';
import { MBTISection } from '~/compontents/MBTISection.tsx';
import { InvestmentPanel } from '~/compontents/InvestmentPanel.tsx';
import { ReviewsOverview } from '~/compontents/ReviewsOverview.tsx';
import { CommentsSection } from '~/compontents/CommentsSection.tsx';
import { DeletedTweetsSection } from '~/compontents/DeletedTweetsSection.tsx';
import { PanelHeader } from '~/compontents/navigation/PanelNavigator';
import HeaderRightControls from '~/compontents/navigation/HeaderRightControls';
import { useNavigation } from '~/compontents/navigation/PanelNavigator';
import {
  Bell,
  GripVertical,
  CircleX,
  Tags,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react';
import { KolData, DeletedTweet, InvestmentData } from '~types';
import { MBTIData } from '~types';
import { ReviewStats } from '~types/review';
import { ProjectMembersSection } from '~/compontents/ProjectMembersSection.tsx';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { messageManager } from '~/utils/messageManager';

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
  isHoverPanel?: boolean; // 新增：是否为悬浮面板模式
}

export const HomePage: React.FC<HomePageProps> = ({
  twInfo = null,
  deletedTweets = [],
  loadingTwInfo = false,
  loadingDel = false,
  userId = '',
  rootData = null,
  loadingRootData = false,
  reviewInfo = null,
  projectMemberData = null,
  loadingProjectMember = false,
  onClose,
  isHoverPanel = false,
}) => {
  const { t, lang } = useI18n();
  const { navigateTo } = useNavigation();
  const langRef = useRef(lang);
  const reviewsRef = useRef<HTMLDivElement | null>(null);

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

  // (moved to HeaderRightControls)

  // Title with classification
  const titleContent = userId ? (
    <div className='flex items-center min-w-0'>
      <span className='max-w-[130px] truncate text-[13px]'>{`@${userId}`}</span>
      {/* {!loadingTwInfo && twInfo?.basicInfo?.isKol && (
        <Tags className='w-4 h-4 ml-4 mb-0.5 theme-text-secondary inline-flex' />
      )}
      {!loadingTwInfo &&
        twInfo?.basicInfo?.classification &&
        twInfo?.basicInfo?.classification !== 'unknown' && (
          <span className='text-xs theme-text-secondary ml-1'>
            {twInfo?.basicInfo?.classification}
          </span>
        )} */}
    </div>
  ) : (
    t('home')
  );

  // Right content for header
  const headerRightContent = <HeaderRightControls onClose={onClose} />;

  return (
    <>
      {/* 只在非悬浮面板模式下显示导航栏 */}
      {!isHoverPanel && (
        <PanelHeader title={titleContent} rightContent={headerRightContent} />
      )}

      {loadingTwInfo ? (
        <div className='flex-1 flex flex-col items-center justify-center min-h-[300px]'>
          <Loader2 className='w-8 h-8 text-blue-400 animate-spin mb-2' />
          <p className='text-sm text-blue-400'>{t('loading')}</p>
        </div>
      ) : (
        <div className='flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden'>
          {/* KOL Followers Section */}
          {twInfo && <KolFollowersSection kolData={twInfo} />}

          {/*/!* Project Members Section *!/*/}
          {/*{!loadingProjectMember && projectMemberData && */}
          {/*  (() => {*/}
          {/*    // 动态获取所有key（排除handle字段）*/}
          {/*    const memberGroups = Object.keys(projectMemberData)*/}
          {/*      .filter(key => key !== 'handle') // 排除handle字段*/}
          {/*      .map(key => projectMemberData[key as keyof typeof projectMemberData])*/}
          {/*      .filter(members => Array.isArray(members) && members.length > 0);*/}
          {/*    const totalMembers = memberGroups.reduce((total, members) => total + (members?.length || 0), 0);*/}
          {/*    return totalMembers > 0;*/}
          {/*  })() && (*/}
          {/*  <ProjectMembersSection data={projectMemberData} />*/}
          {/*)}*/}

          {/* MBTI Section */}
          {mbti && <MBTISection data={mbti} />}

          {/* Investment Panel */}
          {!loadingRootData &&
            rootData &&
            (rootData?.invested || rootData?.investor) &&
            twInfo?.basicInfo?.classification !== 'person' && (
              <InvestmentPanel data={rootData} classicStyle />
            )}

          {/* Reviews Overview */}
          <div id='panel-scroll-reviews' ref={reviewsRef}>
            <ReviewsOverview stats={reviewInfo} />
          </div>

          {/* Comments Section */}
          {userId && (
            <div id='panel-scroll-comments'>
              <CommentsSection userId={userId} initialCommentsCount={0} />
            </div>
          )}

          {/* Deleted Tweets Section */}
          {/* {twInfo?.basicInfo?.isKol ||
          (deletedTweets && deletedTweets.length > 0) ? (
            <DeletedTweetsSection
              deletedTweets={deletedTweets}
              loadingDel={loadingDel}
            />
          ) : null} */}
        </div>
      )}
    </>
  );
};
