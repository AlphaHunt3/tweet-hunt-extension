import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useLocalStorage } from '~storage/useLocalStorage';
import { localStorageInstance } from '~storage';
import useFetchTwId from '~contents/hooks/useFetchTwId';
import { useI18n } from '~contents/hooks/i18n';
import { useUserDomain } from '~contents/hooks/useUserDomain';
import { useLockFn } from 'ahooks';
import { HotTopicHeader } from './HotTopicHeader';
import { HotTopicRichTitle, HotTopicRichSummary } from './HotTopicRichTitle';
import { VoteActionPanel } from './VoteActionPanel';
import { VoteResultPanel } from './VoteResultPanel';
import { VoteCommentSection } from './VoteCommentSection';
import { VoteModal } from './VoteModal';
import { VoteAllModal } from './VoteAllModal';
import { CloseConfirmDialog } from '../CloseConfirmDialog';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  fetchActiveHotVoteTopic,
  submitHotVote,
  submitRevote,
  fetchHotVoteComments,
  postHotVoteComment,
  clearActiveHotVoteTopicCache,
} from './services';
import type {
  HotVoteActiveTopicItem,
  HotVoteComment,
  HotVoteCommentsPagination,
  HotVoteLocalizedText,
  HotVoteResults,
  HotVoteUserState,
} from './types';

export interface HotTopicVoteSectionProps {
  domain: 'web3' | 'ai';
  active?: boolean;
  className?: string;
}

const createDefaultUserState = (maxRevotes = 2): HotVoteUserState => ({
  hasVoted: false,
  votedOptionId: null,
  remainingRevotes: maxRevotes,
});

/** 按当前语言选取本地化字段，缺失时回退默认字段 */
const pickLocalizedText = (
  base: string | null | undefined,
  i18n: HotVoteLocalizedText | null | undefined,
  isEn: boolean
): string => {
  const localized = isEn ? i18n?.en : i18n?.zh;
  return localized || base || '';
};

interface HotTopicVoteCardProps {
  item: HotVoteActiveTopicItem;
  effectiveLang: string;
  /** 当前 X 账号 twid（用于本地缓存按账号隔离，未登录为 null） */
  twId: string | null;
  onRequestClose?: () => void;
  onRetryFetch: () => void;
  canPrevTopic?: boolean;
  canNextTopic?: boolean;
  onPrevTopic?: () => void;
  onNextTopic?: () => void;
  shouldShowGuide?: boolean;
  onDismissGuide?: () => void;
}

/** 单个议题卡片：独立管理投票态、结果、留言与投票弹窗 */
const HotTopicVoteCard: React.FC<HotTopicVoteCardProps> = React.memo(
  ({
    item,
    effectiveLang,
    twId,
    onRequestClose,
    onRetryFetch,
    canPrevTopic,
    canNextTopic,
    onPrevTopic,
    onNextTopic,
    shouldShowGuide,
    onDismissGuide,
  }) => {
    const { t } = useI18n();
    const cardRef = useRef<HTMLDivElement>(null);
    const topic = item.topic;

    // 本地缓存按 X 账号 + 议题隔离，避免切换账号后互相串数据
    const voteCacheKey = `@xhunt/hot-vote:${twId || 'guest'}:${topic.id}`;

    const [userState, setUserState] = useState<HotVoteUserState>(
      item.userState || createDefaultUserState(topic.maxRevotes)
    );

    const isVotingActive =
      topic.isVotingActive !== false &&
      userState.isVotingActive !== false &&
      topic.status !== 'ended';
    const isEnded =
      topic.status === 'ended' ||
      (!isVotingActive && (topic.inactiveReason?.includes('结束') || false));
    const isNotStarted =
      !isVotingActive &&
      !isEnded &&
      (topic.inactiveReason?.includes('尚未开始') || false);
    const [results, setResults] = useState<HotVoteResults | null>(item.results || null);
    const [comments, setComments] = useState<HotVoteComment[]>([]);
    const [pagination, setPagination] = useState<HotVoteCommentsPagination | null>(null);

    const [isVoteModalOpen, setIsVoteModalOpen] = useState(false);
    const [isVoteAllModalOpen, setIsVoteAllModalOpen] = useState(false);
    const [modalInitialOptionId, setModalInitialOptionId] = useState<string | null>(null);
    const [isSubmittingVote, setIsSubmittingVote] = useState(false);
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [voteError, setVoteError] = useState<string | null>(null);

    // 同步服务端下发的投票态/结果；若服务端未投票，则尝试恢复本地缓存备份
    useEffect(() => {
      let cancelled = false;
      void (async () => {
        let nextUserState = item.userState || createDefaultUserState(topic.maxRevotes);
        if (!nextUserState.hasVoted) {
          try {
            const localVote: any = await localStorageInstance.get(voteCacheKey);
            if (localVote?.optionId) {
              nextUserState = {
                hasVoted: true,
                votedOptionId: localVote.optionId,
                remainingRevotes: localVote.remainingRevotes ?? topic.maxRevotes,
                isAnonymous: localVote.isAnonymous ?? false,
              };
            }
          } catch {}
        }
        if (cancelled) return;
        setUserState(nextUserState);
        setResults(item.results || null);
      })();
      return () => {
        cancelled = true;
      };
    }, [item, voteCacheKey]);

    // 拉取留言列表
    const loadComments = useCallback(async (topicId: string, page: number = 1) => {
      setIsLoadingComments(true);
      try {
        const res = await fetchHotVoteComments({ topicId, page, pageSize: 10 });
        if (res?.success && res.data) {
          setComments(res.data.list || []);
          setPagination(res.data.pagination || null);
        }
      } catch (err) {
        console.warn('[HotTopicVoteCard] loadComments error:', err);
      } finally {
        setIsLoadingComments(false);
      }
    }, []);

    useEffect(() => {
      void loadComments(topic.id, 1);
    }, [topic.id, loadComments]);

    // 提交投票 / 修改投票（支持未登录投票与匿名投票）
    const doVoteAction = async (
      optionId: string,
      isAnonymous: boolean = false,
      commentContent?: string
    ): Promise<boolean> => {
      setIsSubmittingVote(true);
      setVoteError(null);

      try {
        if (!userState.hasVoted) {
          // 首次投票：无论是否登录，都会在 header 中携带推特 ID（同时携带可选留言）
          const res = await submitHotVote({
            topicId: topic.id,
            optionId,
            isAnonymous,
            commentContent,
          });

          if (res?.success && res.data) {
            const trimmedComment = commentContent?.trim();
            setUserState({
              ...res.data.userState,
              lastComment: trimmedComment || null,
            });
            setResults(res.data.results);
            void localStorageInstance.set(voteCacheKey, {
              optionId,
              remainingRevotes: res.data.userState.remainingRevotes,
              isAnonymous: res.data.userState.isAnonymous,
              votedAt: Date.now(),
            });
            if (trimmedComment) {
              void loadComments(topic.id, 1);
            }
            return true;
          } else {
            setVoteError(res?.error || t('hotVoteVoteFailed', '操作失败，请稍后重试'));
            return false;
          }
        } else {
          // 改票（同步提交新选项与修改后的评论）
          const trimmedComment = commentContent?.trim();
          const res = await submitRevote({
            topicId: topic.id,
            newOptionId: optionId,
            isAnonymous,
            commentContent: trimmedComment,
          });

          if (res?.success && res.data) {
            setUserState({
              ...res.data.userState,
              ...(trimmedComment !== undefined
                ? { lastComment: trimmedComment || null }
                : {}),
            });
            setResults(res.data.results);
            void localStorageInstance.set(voteCacheKey, {
              optionId,
              remainingRevotes: res.data.userState.remainingRevotes,
              isAnonymous: res.data.userState.isAnonymous,
              votedAt: Date.now(),
            });
            void loadComments(topic.id, 1);
            clearActiveHotVoteTopicCache();
            return true;
          } else {
            setVoteError(res?.error || t('hotVoteVoteFailed', '操作失败，请稍后重试'));
            return false;
          }
        }
      } catch (err) {
        console.warn('[HotTopicVoteCard] vote error:', err);
        setVoteError(t('hotVoteVoteFailed', '操作失败，请稍后重试'));
        return false;
      } finally {
        setIsSubmittingVote(false);
      }
    };

    // 打开投票与留言弹框
    const handleOpenVoteModal = useCallback(
      (optionId?: string) => {
        if (!isVotingActive) return;
        setVoteError(null);
        setModalInitialOptionId(optionId || null);
        setIsVoteModalOpen(true);
      },
      [isVotingActive]
    );

    // 提交新留言（useLockFn 防重复提交；锁定期内的重复调用返回 false）
    const submitCommentLocked = useLockFn(
      async (content: string, isAnonymous: boolean = false): Promise<boolean> => {
        setIsSubmittingComment(true);
        setVoteError(null);
        try {
          const res = await postHotVoteComment({
            topicId: topic.id,
            content,
            isAnonymous,
          });

          if (res?.success && res.data) {
            // 前端直接置顶插入
            setComments((prev) => [res.data!, ...prev]);
            setPagination((prev) =>
              prev ? { ...prev, total: prev.total + 1 } : null
            );
            setUserState((prev) => ({ ...prev, lastComment: content }));
            return true;
          }
          setVoteError(res?.error || t('hotVoteVoteFailed', '操作失败，请稍后重试'));
          return false;
        } catch (err) {
          console.warn('[HotTopicVoteCard] post comment error:', err);
          setVoteError(t('hotVoteVoteFailed', '操作失败，请稍后重试'));
          return false;
        } finally {
          setIsSubmittingComment(false);
        }
      }
    );

    const handleSubmitComment = useCallback(
      async (content: string, isAnonymous: boolean = false): Promise<boolean> => {
        return (await submitCommentLocked(content, isAnonymous)) ?? false;
      },
      [submitCommentLocked]
    );

    // 弹框内同时提交投票与可选留言（支持匿名状态传递）
    const handleModalSubmit = useCallback(
      async ({
        optionId,
        commentContent,
        isAnonymous = false,
      }: {
        optionId: string;
        commentContent?: string;
        isAnonymous?: boolean;
      }): Promise<boolean> => {
        let voteSuccess = true;
        if (!userState.hasVoted || optionId !== userState.votedOptionId) {
          voteSuccess = await doVoteAction(optionId, isAnonymous, commentContent?.trim());
        } else if (commentContent && commentContent.trim()) {
          return await handleSubmitComment(commentContent.trim(), isAnonymous);
        }

        return voteSuccess;
      },
      [userState.hasVoted, userState.votedOptionId, doVoteAction, handleSubmitComment]
    );

    // 我的最近一次留言：优先取留言列表中 isSelf 的最新一条，缺失时回退服务端下发的 lastComment
    const myLastComment = useMemo(
      () => comments.find((c) => c.isSelf)?.content || userState.lastComment || '',
      [comments, userState.lastComment]
    );

    // 按当前语言选取议题展示字段：优先使用接口返回的对应语言字段，缺失时回退默认字段
    const isEn = effectiveLang === 'en';
    const displayTitle = pickLocalizedText(topic.title, topic.titleI18n, isEn);
    const displayTitleHtml =
      pickLocalizedText(topic.titleHtml, topic.titleHtmlI18n, isEn) || null;
    const displaySummary = pickLocalizedText(topic.summary, topic.summaryI18n, isEn);
    const displaySummaryHtml =
      pickLocalizedText(topic.summaryHtml, topic.summaryHtmlI18n, isEn) || null;
    const displayOptions = useMemo(
      () =>
        topic.options.map((opt) => {
          const localizedName = pickLocalizedText(opt.name, opt.nameI18n, isEn);
          return localizedName !== opt.name ? { ...opt, name: localizedName } : opt;
        }),
      [topic, isEn]
    );

    // 判断 summary 是否与 title 重复，若实质相同则不重复展示
    const showSummary = useMemo(() => {
      if (!displaySummary) return false;
      const cleanTitle = displayTitle.replace(/[^\w\u4e00-\u9fa5]/g, '').trim();
      const cleanSummary = displaySummary.replace(/[^\w\u4e00-\u9fa5]/g, '').trim();
      return cleanSummary.length > 0 && cleanTitle !== cleanSummary;
    }, [displayTitle, displaySummary]);

    return (
      <div
        ref={cardRef}
        className='relative px-3 pt-0.5 pb-2.5 flex flex-col gap-2 transition-all'
      >
        {/* 议题标题 + 核心冲突简介：紧凑分组（间距小于与下方选项区的间距） */}
        <div className='flex flex-col gap-1'>
          <div
            className={`relative flex items-center min-w-0 ${canPrevTopic ? 'pl-0.5' : ''} ${canNextTopic ? 'pr-0.5' : ''}`}
          >
            {/* 切换上一条：悬浮在标题左侧边界（与 label 水平对齐） */}
            {canPrevTopic && onPrevTopic && (
              <button
                type='button'
                onClick={onPrevTopic}
                title={t('prev', '上一条')}
                aria-label='Previous topic'
                className='absolute -left-6 top-1/2 -translate-y-1/2 z-20 w-6 h-6 flex items-center justify-center rounded-full bg-white/95 dark:bg-[#1c222d]/95 border border-black/[0.08] dark:border-white/[0.12] text-slate-500 dark:text-slate-400 shadow-[0_2px_8px_rgba(0,0,0,0.10)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:border-[#1D9BF0]/50 hover:text-[#1D9BF0] dark:hover:border-[#1D9BF0]/60 dark:hover:text-[#1D9BF0] hover:scale-105 active:scale-95 transition-all opacity-0 pointer-events-none group-hover/hotvote:opacity-100 group-hover/hotvote:pointer-events-auto cursor-pointer before:absolute before:inset-[-4px] before:content-[""]'
              >
                <ChevronLeft className='w-3.5 h-3.5' strokeWidth={2.2} />
              </button>
            )}

            <HotTopicRichTitle
              title={displayTitle}
              titleHtml={displayTitleHtml}
              className='w-full min-w-0 flex-1'
              suffix={
                !isVotingActive ? (
                  <span className='inline-flex items-center text-[10px] px-1.5 py-0.2 rounded font-normal shrink-0 bg-black/[0.04] dark:bg-white/[0.06] theme-text-secondary border border-black/[0.06] dark:border-white/[0.08] select-none ml-1.5 align-middle whitespace-nowrap'>
                    {isEnded
                      ? t('hotVoteStatusEnded', '已结束')
                      : t('hotVoteStatusNotStarted', '未开始')}
                  </span>
                ) : null
              }
            />

            {/* 切换下一条：悬浮在标题右侧边界（与 label 水平对齐） */}
            {canNextTopic && onNextTopic && (
              <button
                type='button'
                onClick={onNextTopic}
                title={t('next', '下一条')}
                aria-label='Next topic'
                className={`absolute -right-6 top-1/2 -translate-y-1/2 z-20 w-6 h-6 flex items-center justify-center rounded-full bg-white/95 dark:bg-[#1c222d]/95 border border-black/[0.08] dark:border-white/[0.12] text-slate-500 dark:text-slate-400 shadow-[0_2px_8px_rgba(0,0,0,0.10)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:border-[#1D9BF0]/50 hover:text-[#1D9BF0] dark:hover:border-[#1D9BF0]/60 dark:hover:text-[#1D9BF0] hover:scale-105 active:scale-95 transition-all cursor-pointer before:absolute before:inset-[-4px] before:content-[""] ${
                  shouldShowGuide
                    ? 'opacity-100 pointer-events-auto ring-1 ring-[#1D9BF0]/50 bg-[#1D9BF0]/5'
                    : 'opacity-0 pointer-events-none group-hover/hotvote:opacity-100 group-hover/hotvote:pointer-events-auto'
                }`}
              >
                <ChevronRight className='w-3.5 h-3.5' strokeWidth={2.2} />
              </button>
            )}

            {/* 新手引导：仅在议题数 > 1 且未切换过时一开始展示，气泡指向右侧切换按钮 */}
            {shouldShowGuide && canNextTopic && onDismissGuide && (
              <div
                className='absolute right-2 top-1/2 -translate-y-1/2 z-30 w-[208px] rounded-2xl theme-bg-secondary px-3 py-2.5 shadow-[0_12px_34px_rgba(0,0,0,0.22)] transition-opacity duration-200'
                role='status'
                style={{
                  fontFamily:
                    'TwitterChirp, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  border: '1px solid rgba(29, 155, 240, 0.22)',
                  backgroundImage:
                    'linear-gradient(135deg, rgba(29,155,240,0.08), rgba(29,155,240,0.015) 42%, transparent)',
                }}
              >
                {/* 气泡右侧小三角，指向右侧切换按钮 */}
                <div
                  className='absolute -right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 rotate-45 theme-bg-secondary border-t border-r'
                  style={{
                    borderColor: 'rgba(29, 155, 240, 0.22)',
                    backgroundImage:
                      'linear-gradient(135deg, rgba(29,155,240,0.08), rgba(29,155,240,0.015))',
                  }}
                  aria-hidden='true'
                />
                <button
                  type='button'
                  className='absolute right-2 top-2 rounded-full p-0.5 theme-text-secondary hover:theme-bg-tertiary transition-colors cursor-pointer'
                  aria-label={t('close', '关闭')}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDismissGuide();
                  }}
                >
                  <X className='h-3.5 w-3.5 opacity-75' />
                </button>
                <div className='pr-4 text-[12px] font-semibold text-[#1D9BF0] leading-none mb-1'>
                  {t('hotVoteSwitchTopicGuideTitle', '切换热点投票')}
                </div>
                <div
                  className='pr-4 text-[11.5px] leading-[17px] theme-text-secondary'
                  style={{ letterSpacing: '0.005em' }}
                >
                  {t('hotVoteSwitchTopicGuideDesc', '点击这里可以切换不同热点投票')}
                </div>
                <div className='mt-1.5 flex justify-end'>
                  <button
                    type='button'
                    className='rounded-full px-2 py-0.5 text-[12px] font-semibold leading-[18px] text-[#1D9BF0] hover:bg-[#1D9BF0]/10 transition-colors cursor-pointer'
                    onClick={(e) => {
                      e.stopPropagation();
                      onDismissGuide();
                    }}
                  >
                    {t('headerControlsGuideGotIt', '知道了')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 仅在 summary 与 title 不重复时展示核心冲突介绍 */}
          {showSummary && (
            <HotTopicRichSummary
              summary={displaySummary}
              summaryHtml={displaySummaryHtml}
              className='text-[11.5px] theme-text-secondary leading-relaxed'
            />
          )}
        </div>

        {/* 操作区：未投票且进行中展示待选列表；已投票或活动已结束展示统计结果 */}
        {!userState.hasVoted && isVotingActive ? (
          <VoteActionPanel
            options={displayOptions}
            onVote={async (optionId) => handleOpenVoteModal(optionId)}
            isSubmitting={isSubmittingVote}
            currentOptionId={userState.votedOptionId}
            topicType={topic.topicType}
          />
        ) : (
          <VoteResultPanel
            options={displayOptions}
            votedOptionId={userState.votedOptionId}
            results={results}
            isEnded={!isVotingActive || isEnded}
            onOptionClick={
              isVotingActive
                ? (optionId) => handleOpenVoteModal(optionId)
                : undefined
            }
            onRetryFetchResults={onRetryFetch}
          />
        )}

        {/* 留言列表展示区：无他人留言时彻底隐藏，不占任何空间；有留言时紧凑展示 */}
        <VoteCommentSection
          comments={comments}
          isLoadingComments={isLoadingComments}
          totalParticipants={results?.totalParticipants}
          onOpenCommentModal={
            isVotingActive
              ? () => handleOpenVoteModal(userState.votedOptionId || undefined)
              : undefined
          }
          onOpenViewAll={() => setIsVoteAllModalOpen(true)}
        />

        {/* 投票与留言一体化弹框（全屏遮罩，位置跟随投票区域） */}
        <VoteModal
          isOpen={isVoteModalOpen}
          anchorRef={cardRef}
          onClose={() => {
            setIsVoteModalOpen(false);
            setVoteError(null);
          }}
          topic={{ ...topic, options: displayOptions }}
          selectedOptionId={modalInitialOptionId || userState.votedOptionId || displayOptions[0]?.id || ''}
          isSubmitting={isSubmittingVote || isSubmittingComment}
          hasVoted={userState.hasVoted}
          votedOptionId={userState.votedOptionId}
          initialIsAnonymous={userState.isAnonymous}
          initialComment={myLastComment}
          submitError={voteError}
          onSubmit={handleModalSubmit}
        />

        {/* 全量选民与留言动态流大弹框 */}
        <VoteAllModal
          isOpen={isVoteAllModalOpen}
          anchorRef={cardRef}
          onClose={() => setIsVoteAllModalOpen(false)}
          topicId={topic.id}
          topicTitle={displayTitle}
          options={displayOptions}
          totalParticipants={results?.totalParticipants}
        />
      </div>
    );
  }
);

export const HotTopicVoteSection: React.FC<HotTopicVoteSectionProps> = React.memo(
  ({ domain, active = true, className = '' }) => {
    const { lang, t } = useI18n();
    const { data: twId, loading: isTwIdLoading } = useFetchTwId();

    // 有效语言与请求头 x-language 保持一致：只认插件设置（@settings/language1），未设置时默认 en
    const effectiveLang = lang === 'zh' ? 'zh' : 'en';

    const [items, setItems] = useState<HotVoteActiveTopicItem[]>([]);
    const [isLoadingTopic, setIsLoadingTopic] = useState(false);
    const [topicIndex, setTopicIndex] = useState(0);

    const [showHotVote, setShowHotVote] = useLocalStorage('@settings/showHotVote', true);
    const [isDismissed, setIsDismissed] = useState(false);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);

    // 拉取活跃热点议题列表（返回几个展示几个，依次往下平铺）
    const loadActiveTopic = useCallback(
      async (force = false) => {
        if (!active || isTwIdLoading) return;

        setIsLoadingTopic(true);

        try {
          const res = await fetchActiveHotVoteTopic({
            domain,
            lang: effectiveLang,
            force,
          });

          // 兼容多种返回结构：data.topics 数组 / data 本身即数组 / 旧的单 topic 字段
          const rawData: any = res?.success ? res.data : null;
          const rawList: any[] = Array.isArray(rawData)
            ? rawData
            : Array.isArray(rawData?.topics)
            ? rawData.topics
            : rawData?.topic
            ? [
                {
                  topic: rawData.topic,
                  userState: rawData.userState,
                  results: rawData.results,
                },
              ]
            : [];

          const nextItems: HotVoteActiveTopicItem[] = rawList
            .filter((it) => it?.topic)
            .map((it) => ({
              topic: it.topic,
              userState: it.userState || createDefaultUserState(it.topic.maxRevotes),
              results: it.results || null,
            }));

          setItems(nextItems);
        } catch (err) {
          console.warn('[HotTopicVoteSection] loadActiveTopic error:', err);
        } finally {
          setIsLoadingTopic(false);
        }
      },
      [active, domain, effectiveLang, isTwIdLoading]
    );

    // 仅在当前处于激活状态时发起一次请求；服务层按领域缓存并去重
    useEffect(() => {
      if (active) {
        void loadActiveTopic();
      }
    }, [active, loadActiveTopic]);

    // 点击关闭按钮，弹出确认提示
    const handleRequestClose = useCallback(() => {
      setShowCloseConfirm(true);
    }, []);

    // 议题数量变化时校正当前索引，避免越界
    useEffect(() => {
      setTopicIndex((prev) => Math.max(0, Math.min(prev, items.length - 1)));
    }, [items]);

    const activeTopicIndex = Math.max(0, Math.min(topicIndex, items.length - 1));

    const { hasBoth } = useUserDomain();
    const [isDomainGuideDismissed] = useLocalStorage<boolean>(
      '@xhunt/domain-switcher-guide-dismissed',
      false
    );
    const [domainClickCount] = useLocalStorage<number>(
      '@xhunt/domain-capsule-click-count',
      0
    );

    const [hasSwitchedTopic, setHasSwitchedTopic] = useLocalStorage<boolean>(
      '@xhunt/hot-topic-vote-has-switched',
      false
    );

    const canPrevTopic = items.length > 1 && activeTopicIndex > 0;
    const canNextTopic = items.length > 1 && activeTopicIndex < items.length - 1;

    // 前提约束：
    // 1. 若用户选中双领域（hasBoth），必须等 AI/Web3 切换引导（第一步）完成/关闭后，本引导（第二步）才主动展示；
    // 2. 若用户为单领域（!hasBoth），无需等待第一步；
    // 3. 必须有多条议题（items.length > 1）且未切换过，才展示切换引导。
    const isDomainGuideStepDone =
      !hasBoth || isDomainGuideDismissed || domainClickCount > 0;
    const shouldShowGuide =
      items.length > 1 && !hasSwitchedTopic && isDomainGuideStepDone;

    const handleDismissGuide = useCallback(() => {
      setHasSwitchedTopic(true);
    }, [setHasSwitchedTopic]);

    const handlePrevTopic = useCallback(() => {
      setHasSwitchedTopic(true);
      setTopicIndex((prev) => Math.max(0, prev - 1));
    }, [setHasSwitchedTopic]);

    const handleNextTopic = useCallback(() => {
      setHasSwitchedTopic(true);
      setTopicIndex((prev) => Math.min(items.length - 1, prev + 1));
    }, [items.length, setHasSwitchedTopic]);

    // 确认关闭区域，并同步写入设置项
    const handleConfirmClose = useCallback(async () => {
      setShowCloseConfirm(false);
      setIsDismissed(true);
      setShowHotVote(false);
      try {
        await localStorageInstance.set('@settings/showHotVote', false);
      } catch {}
    }, [setShowHotVote]);

    if (!active || !showHotVote || isDismissed || items.length === 0 || isLoadingTopic) {
      return null;
    }

    return (
      <div
        data-hotvote-section='true'
        data-hotvote-guide-active={shouldShowGuide ? 'true' : 'false'}
        className={`group/hotvote relative overflow-visible border-b border-black/[0.06] dark:border-white/[0.08] transition-all ${showCloseConfirm ? 'min-h-[140px]' : ''} ${className}`}
      >
        {/* 顶部标题栏：与 Web3 实时热门保持统一视觉规范 */}
        <HotTopicHeader
          domain={domain}
          onClose={handleRequestClose}
        />

        {/* 多议题：一次只展示一个，其余保持挂载（隐藏）以保留各自的投票/留言状态 */}
        {items.map((item, idx) => (
          <div key={item.topic.id} className={idx === activeTopicIndex ? '' : 'hidden'}>
            <HotTopicVoteCard
              item={item}
              effectiveLang={effectiveLang}
              twId={twId}
              onRequestClose={handleRequestClose}
              onRetryFetch={() => void loadActiveTopic(true)}
              canPrevTopic={canPrevTopic}
              canNextTopic={canNextTopic}
              onPrevTopic={handlePrevTopic}
              onNextTopic={handleNextTopic}
              shouldShowGuide={shouldShowGuide}
              onDismissGuide={handleDismissGuide}
            />
          </div>
        ))}



        {/* 关闭确认对话框 */}
        <CloseConfirmDialog
          isOpen={showCloseConfirm}
          onClose={() => setShowCloseConfirm(false)}
          onConfirm={handleConfirmClose}
          prefixKey='confirmCloseHotVotePrefix'
          suffixKey='confirmCloseHotVoteSuffix'
          className='!absolute !inset-0 !z-50 !items-center !justify-center'
        />
      </div>
    );
  }
);

export default HotTopicVoteSection;
