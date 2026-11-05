import React, { useMemo, useState, useEffect } from 'react';
import { Loader2, ChevronRight } from 'lucide-react';
import { useI18n } from '~contents/hooks/i18n';
import { SimpleTooltip } from '../SimpleTooltip';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import type { HotVoteComment } from './types';
import { formatXHuntRankLabel } from './formatXHuntRank';

dayjs.extend(relativeTime);

interface VoteCommentSectionProps {
  comments: HotVoteComment[];
  isLoadingComments: boolean;
  totalParticipants?: number;
  onOpenCommentModal?: () => void;
  onOpenViewAll?: () => void;
}

/** 剥离“支持”前缀，提取纯名称 */
function cleanEntityName(name: string, supportPrefix: string = '支持'): string {
  if (!name) return '';
  const trimmed = supportPrefix.trim();
  let cleaned = name.trim();
  if (cleaned.toLowerCase().startsWith(trimmed.toLowerCase())) {
    cleaned = cleaned.slice(trimmed.length).trim();
  }
  return cleaned || name;
}

const CommentAvatar: React.FC<{
  userAvatar?: string;
  displayName?: string;
  userName?: string;
}> = React.memo(({ userAvatar, displayName, userName }) => {
  const [hasError, setHasError] = useState(false);
  const title = displayName || userName || '?';

  return (
    <div className='w-3.5 h-3.5 rounded-full overflow-hidden bg-slate-500/20 shrink-0 flex items-center justify-center mt-0.5 border border-slate-500/15'>
      {userAvatar && !hasError ? (
        <img
          src={userAvatar}
          alt={title}
          className='w-full h-full object-cover'
          onError={() => setHasError(true)}
        />
      ) : (
        <span className='text-[8px] font-bold text-slate-400 select-none'>
          {title.slice(0, 1)}
        </span>
      )}
    </div>
  );
});

export const VoteCommentSection: React.FC<VoteCommentSectionProps> = React.memo(
  ({
    comments,
    isLoadingComments,
    totalParticipants,
    onOpenCommentModal,
    onOpenViewAll,
  }) => {
    const { t, lang } = useI18n();
    const supportPrefix = t('hotVoteSupportPrefix', '支持');

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    // 严格按时间降序（最新评论排第一），主卡片最多仅展示最新的前 10 条
    const displayComments = useMemo(() => comments.slice(0, 10), [comments]);

    // 8 秒自动横向轮播；鼠标悬停暂停轮播，移开恢复
    useEffect(() => {
      if (isHovered || displayComments.length <= 1) return;
      const timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % displayComments.length);
      }, 8000);
      return () => clearInterval(timer);
    }, [isHovered, displayComments.length]);

    // 确保当前索引处于合法范围
    const activeIndex =
      displayComments.length > 0 ? currentIndex % displayComments.length : 0;

    // 没有留言且未在加载中
    if (!isLoadingComments && comments.length === 0) {
      if (totalParticipants != null && totalParticipants > 0) {
        return (
          <div className='pt-1.5 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between text-[10.5px] theme-text-secondary select-none px-0.5'>
            <div className='flex items-center gap-2'>
              <span>
                {t('hotVoteParticipants', '{count} 人参与').replace(
                  '{count}',
                  String(totalParticipants)
                )}
              </span>
              {onOpenViewAll && (
                <button
                  type='button'
                  onClick={onOpenViewAll}
                  className='group/view-all inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium leading-none text-[#1D9BF0] dark:text-[#1D9BF0] bg-[#1D9BF0]/[0.04] hover:bg-[#1D9BF0]/[0.08] transition-all cursor-pointer active:scale-95'
                >
                  <span>{t('hotVoteViewAll', '查看全部')}</span>
                  <ChevronRight className='w-2.5 h-2.5 stroke-[2.5] opacity-80 group-hover/view-all:opacity-100 group-hover/view-all:translate-x-0.5 transition-transform' />
                </button>
              )}
            </div>
          </div>
        );
      }
      return null;
    }

    if (isLoadingComments && comments.length === 0) {
      return (
        <div className='flex items-center justify-center py-1.5 border-t border-black/[0.05] dark:border-white/[0.06]'>
          <Loader2 className='w-3 h-3 text-blue-400 animate-spin' />
        </div>
      );
    }

    const currentComment = displayComments[activeIndex];
    if (!currentComment) return null;

    const formattedTime = dayjs(currentComment.createdAt)
      .locale(lang === 'zh' ? 'zh-cn' : 'en')
      .fromNow();

    const optPureName = cleanEntityName(currentComment.optionName || '', supportPrefix);
    const optDisplayName = currentComment.isGua
      ? t('hotVoteGua', '吃瓜')
      : optPureName;
    const xhuntRankLabel = formatXHuntRankLabel(
      currentComment.xhuntRank,
      currentComment.isAnonymous,
      lang,
      t
    );

    return (
      <div
        className='relative pt-1.5 border-t border-black/[0.05] dark:border-white/[0.06] select-none'
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className='flex items-start gap-1.5 text-xs py-0.5'>
          {/* 头像 */}
          <CommentAvatar
            userAvatar={currentComment.userAvatar}
            displayName={currentComment.displayName}
            userName={currentComment.userName}
          />

          {/* 留言内容区：一次展示一条，左右自动轮播 */}
          <div className='flex flex-col flex-1 min-w-0'>
            <div className='flex items-center justify-between leading-none'>
              <div className='flex items-center gap-1 min-w-0 flex-1 pr-1'>
                <span className='font-semibold text-[11px] theme-text-primary truncate max-w-[100px]'>
                  {currentComment.displayName || currentComment.userName}
                </span>

               {/* 投票站队胶囊徽标 */}
               {currentComment.optionId && (
                 <span
                   className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-medium shrink-0 leading-none ${
                     currentComment.isGua
                       ? 'bg-black/[0.04] dark:bg-white/[0.06] theme-text-secondary border border-black/[0.06] dark:border-white/[0.08]'
                       : 'bg-black/[0.04] dark:bg-white/[0.06] theme-text-primary border border-black/[0.08] dark:border-white/[0.1]'
                   }`}
                 >
                   {currentComment.optionAvatar && (
                     <img
                       src={currentComment.optionAvatar}
                       alt=''
                       className='w-2.5 h-2.5 rounded-full object-cover shrink-0'
                     />
                   )}
                   <span className='truncate max-w-[80px]'>{optDisplayName}</span>
                 </span>
               )}

               {currentComment.isSelf && (
                  <span className='text-[9px] px-1 py-0.2 rounded bg-black/[0.04] dark:bg-white/[0.06] theme-text-secondary border border-black/[0.06] dark:border-white/[0.08] shrink-0 font-normal select-none'>
                    {t('selfTag', '我')}
                  </span>
               )}
                <span className='text-[9px] theme-text-secondary'>·</span>
                <span className='text-[9.5px] theme-text-secondary shrink-0'>
                  {formattedTime}
                </span>
              </div>

              {/* 右侧：查看全部按钮 */}
              {onOpenViewAll && (
                <div className='flex items-center shrink-0 select-none'>
                  <button
                    type='button'
                    onClick={onOpenViewAll}
                    className='group/view-all inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium leading-none text-[#1D9BF0] dark:text-[#1D9BF0] bg-[#1D9BF0]/[0.04] hover:bg-[#1D9BF0]/[0.08] transition-all cursor-pointer active:scale-95'
                  >
                    <span>{t('hotVoteViewAll', '查看全部')}</span>
                    <ChevronRight className='w-2.5 h-2.5 stroke-[2.5] opacity-80 group-hover/view-all:opacity-100 group-hover/view-all:translate-x-0.5 transition-transform' />
                  </button>
                </div>
              )}
            </div>

            {xhuntRankLabel && (
              <span className='mt-1 text-[9.5px] leading-none theme-text-secondary whitespace-nowrap'>
                {xhuntRankLabel}
              </span>
            )}

            {/* 留言正文：单行截断；字数超过一行时，hover 才展示完整内容浮层 */}
            <SimpleTooltip
              placement='bottom'
              fullWidth={true}
              onlyWhenOverflow={true}
              className='mt-1 w-full !block !px-0 !mx-0'
              content={
                <span className='block w-full whitespace-normal break-words leading-snug text-left text-xs'>
                  {currentComment.content}
                </span>
              }
            >
              <p className='text-[11px] theme-text-primary truncate w-full cursor-default leading-snug'>
                {currentComment.content}
              </p>
            </SimpleTooltip>
          </div>
        </div>
      </div>
    );
  }
);

export default VoteCommentSection;
