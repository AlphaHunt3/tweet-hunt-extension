import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, MessageSquare } from 'lucide-react';
import { useI18n } from '~contents/hooks/i18n';
import { useLocalStorage } from '~storage/useLocalStorage';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { fetchAllHotVotes } from './services';
import type { HotVoteOption, HotVoteAllVotesItem } from './types';
import { useAnchorPosition } from './useAnchorPosition';
import { useLockBodyScroll } from './useLockBodyScroll';
import { useHotVotePortalHost } from './useHotVotePortalHost';
import { formatXHuntRankLabel } from './formatXHuntRank';

dayjs.extend(relativeTime);

export interface VoteAllModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicId: string;
  topicTitle: string;
  options: HotVoteOption[];
  totalParticipants?: number;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

/** 剥离“支持”前缀，提取纯名称 */
function cleanEntityName(name: string, supportPrefix: string = '支持'): string {
  if (!name) return '';
  let cleaned = name.trim();
  const prefixes = [
    supportPrefix.trim(),
    '支持',
    '已支持',
    'Support',
    'support',
  ].filter(Boolean);
  for (const p of prefixes) {
    if (cleaned.toLowerCase().startsWith(p.toLowerCase())) {
      cleaned = cleaned.slice(p.length).trim();
    }
  }
  return cleaned || name;
}

export const VoteAllModal: React.FC<VoteAllModalProps> = React.memo(
  ({ isOpen, onClose, topicId, topicTitle, options, totalParticipants, anchorRef }) => {
    const { t, lang } = useI18n();
    const [theme] = useLocalStorage('@xhunt/theme', 'dark');
    const supportPrefix = t('hotVoteSupportPrefix', '支持');

    const [activeTab, setActiveTab] = useState<string>('all'); // 'all' or option.id
    const [records, setRecords] = useState<HotVoteAllVotesItem[]>([]);
    const [summaryByOption, setSummaryByOption] = useState<Record<string, number>>({});
    const [totalCount, setTotalCount] = useState<number>(totalParticipants || 0);
    const [page, setPage] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
    const requestIdRef = useRef(0);

    // 选项名格式化
    const getOptionDisplayName = useCallback(
      (name?: string, isGua?: boolean): string => {
        if (!name) return isGua ? t('hotVoteGua', '吃瓜') : '';
        return name;
      },
      [t]
    );

    // 选项映射
    const optionMap = useMemo(() => {
      const map: Record<string, HotVoteOption> = {};
      for (const opt of options) {
        map[opt.id] = opt;
      }
      return map;
    }, [options]);

    // 加载数据
    const loadData = useCallback(
      async (targetPage: number, optionIdFilter: string, isAppend: boolean = false) => {
        const requestId = ++requestIdRef.current;
        if (targetPage === 1) {
          setIsLoading(true);
        } else {
          setIsLoadingMore(true);
        }

        try {
          const res = await fetchAllHotVotes({
            topicId,
            optionId: optionIdFilter === 'all' ? undefined : optionIdFilter,
            page: targetPage,
            pageSize: 20,
          });

          if (requestId === requestIdRef.current && res?.success && res.data) {
            const list = res.data.list || [];
            setRecords((prev) => (isAppend ? [...prev, ...list] : list));
            setPage(targetPage);
            setTotalPages(res.data.pagination?.totalPages || 1);
            if (res.data.summary) {
              setSummaryByOption(res.data.summary.byOption || {});
              setTotalCount(res.data.summary.total || 0);
            }
          }
        } catch (err) {
          console.warn('[VoteAllModal] loadData error:', err);
        } finally {
          if (requestId === requestIdRef.current) {
            setIsLoading(false);
            setIsLoadingMore(false);
          }
        }
      },
      [topicId]
    );

    // 弹框打开或切换 Tab 时触发初次加载
    useEffect(() => {
      if (isOpen && topicId) {
        setPage(1);
        void loadData(1, activeTab, false);
      }
    }, [isOpen, topicId, activeTab, loadData]);

    const containerRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    // 弹框打开时禁用网页滚动，关闭时恢复
    useLockBodyScroll(isOpen);

    // 渲染到文档级 shadow host（z-index 置顶），避免被 X 时间线列的层叠上下文压住
    const portalHost = useHotVotePortalHost(isOpen);

    const position = useAnchorPosition({
      anchorRef,
      containerRef,
      modalRef,
      isOpen,
      defaultHeight: 480,
      minMarginTop: 80,
      minMarginBottom: 80,
    });

    if (!isOpen || !portalHost) return null;

    const handleLoadMore = () => {
      if (page < totalPages && !isLoadingMore) {
        void loadData(page + 1, activeTab, true);
      }
    };

    return createPortal(
      <div
        ref={containerRef}
        data-theme={theme}
        className='fixed inset-0 z-[999990] flex flex-col items-center justify-center select-none pointer-events-auto overscroll-contain'
        onWheel={(e) => e.stopPropagation()}
      >
        {/* 背景轻量半透明遮罩 */}
        <div
          className='absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity'
          onClick={onClose}
          onWheel={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        />

        {/* 弹框主体：始终在屏幕正中间，上下保留最少 80px 安全距离 */}
        <div
          ref={modalRef}
          style={{
            maxHeight: `${position.maxHeight}px`,
          }}
          className='relative z-10 w-full max-w-[340px] bg-white dark:bg-[#151921] theme-text-primary rounded-2xl border border-black/10 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden shrink-0 overscroll-contain'
          onClick={(e) => e.stopPropagation()}
        >
          {/* 顶栏：标题与关闭按钮 */}
          <div className='flex items-center justify-between px-4 py-3 border-b border-black/[0.06] dark:border-white/[0.08] shrink-0'>
            <div className='flex flex-col min-w-0 pr-2'>
              <div className='flex items-center gap-1.5'>
                <span className='font-bold text-sm theme-text-primary'>
                  {t('hotVoteAllActivityTitle', '全部投票动态')}
                </span>
                <span className='text-xs theme-text-secondary font-medium'>
                  ({t('hotVoteParticipants', '{count} 人参与').replace('{count}', String(totalCount))})
                </span>
              </div>
              <span className='text-[11px] theme-text-secondary truncate mt-0.5'>
                {topicTitle}
              </span>
            </div>

            <button
              type='button'
              onClick={onClose}
              aria-label={t('close', '关闭')}
              className='p-1 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.08] theme-text-secondary hover:theme-text-primary transition-colors shrink-0 cursor-pointer'
            >
              <X className='w-4 h-4' />
            </button>
          </div>

          {/* 选项 Tab 栏：支持横向滚动切换不同立场 */}
          <div className='flex items-center gap-1.5 px-3 py-2 border-b border-black/[0.04] dark:border-white/[0.06] overflow-x-auto shrink-0 scrollbar-none'>
            {/* 全部 Tab */}
            <button
              type='button'
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-blue-500 text-white shadow-xs'
                  : 'bg-black/[0.03] dark:bg-white/[0.05] theme-text-secondary hover:theme-text-primary'
              }`}
            >
              {t('all', '全部')} ({totalCount})
            </button>

            {/* 各选项 Tab */}
            {options.map((opt) => {
              const count = summaryByOption[opt.id] ?? 0;
              const displayName = opt.isGua
                ? getOptionDisplayName(opt.name, opt.isGua)
                : cleanEntityName(opt.name, supportPrefix) || getOptionDisplayName(opt.name, opt.isGua);
              const isSelected = activeTab === opt.id;

              return (
                <button
                  key={opt.id}
                  type='button'
                  onClick={() => setActiveTab(opt.id)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-500 text-white shadow-xs'
                      : 'bg-black/[0.03] dark:bg-white/[0.05] theme-text-secondary hover:theme-text-primary'
                  }`}
                >
                  {opt.avatar && (
                    <img
                      src={opt.avatar}
                      alt=''
                      className='w-3 h-3 rounded-full object-cover shrink-0'
                    />
                  )}
                  <span>{displayName}</span>
                  <span className='opacity-80 text-[10.5px] font-mono'>({count})</span>
                </button>
              );
            })}
          </div>

          {/* 选民与留言动态流内容区 */}
          <div className='flex-1 overflow-y-auto p-3.5 space-y-2 min-h-[180px] overscroll-contain'>
            {isLoading && page === 1 ? (
              <div className='flex flex-col items-center justify-center py-12 gap-2 theme-text-secondary'>
                <Loader2 className='w-5 h-5 text-blue-500 animate-spin' />
                <span className='text-xs'>{t('loading', '加载中...')}</span>
              </div>
            ) : records.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-12 gap-1 theme-text-secondary text-xs'>
                <MessageSquare className='w-6 h-6 opacity-40 mb-1' />
                <span>{t('hotVoteNoVotesInTab', '暂无相关投票记录')}</span>
              </div>
            ) : (
              records.map((item) => {
                const opt = optionMap[item.optionId];
                const optPureName = cleanEntityName(item.optionName || opt?.name || '', supportPrefix);
                const optDisplayName = opt?.isGua
                  ? t('hotVoteGua', '吃瓜')
                  : optPureName;
                const formattedTime = dayjs(item.createdAt)
                  .locale(lang === 'zh' ? 'zh-cn' : 'en')
                  .fromNow();
                const xhuntRankLabel = formatXHuntRankLabel(
                  item.xhuntRank,
                  item.isAnonymous,
                  lang,
                  t
                );

                return (
                  <div
                    key={item.id}
                    className='flex items-start gap-2 text-xs p-2.5 rounded-xl bg-black/[0.015] dark:bg-white/[0.025] border border-black/[0.04] dark:border-white/[0.05]'
                  >
                    {/* 选民头像 */}
                    <div className='w-6 h-6 rounded-full overflow-hidden bg-slate-500/20 shrink-0 flex items-center justify-center border border-slate-500/15 mt-0.5'>
                      {item.userAvatar ? (
                        <img
                          src={item.userAvatar}
                          alt={item.displayName || item.userName}
                          className='w-full h-full object-cover'
                        />
                      ) : (
                        <span className='text-[10px] font-bold text-slate-400'>
                          {(item.displayName || item.userName || '?').slice(0, 1)}
                        </span>
                      )}
                    </div>

                    {/* 选民详情与发言 */}
                    <div className='flex flex-col flex-1 min-w-0'>
                      {/* 选民元信息行 */}
                      <div className='flex items-center justify-between gap-1'>
                        <div className='flex items-center gap-1.5 flex-wrap min-w-0'>
                          <span className='font-semibold text-xs theme-text-primary truncate max-w-[140px]'>
                            {item.displayName || item.userName}
                          </span>

                        {/* 站队胶囊徽标 */}
                        <span
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-medium shrink-0 ${
                            item.isGua
                               ? 'bg-black/[0.04] dark:bg-white/[0.06] theme-text-secondary border border-black/[0.06] dark:border-white/[0.08]'
                               : 'bg-black/[0.04] dark:bg-white/[0.06] theme-text-primary border border-black/[0.08] dark:border-white/[0.1]'
                          }`}
                        >
                          {item.optionAvatar && (
                             <img
                               src={item.optionAvatar}
                               alt=''
                               className='w-2.5 h-2.5 rounded-full object-cover'
                             />
                           )}
                           <span>{optDisplayName}</span>
                         </span>

                        {item.isSelf && (
                           <span className='text-[9px] px-1 py-0.2 rounded bg-black/[0.04] dark:bg-white/[0.06] theme-text-secondary border border-black/[0.06] dark:border-white/[0.08] font-normal shrink-0'>
                             {t('selfTag', '我')}
                           </span>
                        )}
                        </div>

                        {/* 时间 */}
                        <span className='text-[10px] theme-text-secondary shrink-0'>
                          {formattedTime}
                        </span>
                      </div>

                      {xhuntRankLabel && (
                        <span className='mt-1 text-[10px] leading-none theme-text-secondary whitespace-nowrap'>
                          {xhuntRankLabel}
                        </span>
                      )}

                      {/* 理由/留言正文（直接展示文本，不额外嵌套背景容器） */}
                      {Boolean(item.hasComment && item.commentContent) && (
                        <p className='mt-1 text-xs leading-relaxed break-words theme-text-primary'>
                          {item.commentContent}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* 加载更多按钮 */}
            {records.length > 0 && page < totalPages && (
              <div className='pt-2 flex justify-center'>
                <button
                  type='button'
                  disabled={isLoadingMore}
                  onClick={handleLoadMore}
                  className='inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium theme-text-secondary hover:theme-text-primary hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer disabled:opacity-50'
                >
                  {isLoadingMore ? (
                    <Loader2 className='w-3 h-3 animate-spin' />
                  ) : null}
                  <span>{t('loadMore', '加载更多')}</span>
                </button>
              </div>
            )}

            {/* 到底提示 */}
            {records.length > 0 && page >= totalPages && (
              <div className='pt-2 pb-1 text-center text-[10px] text-slate-400/60 dark:text-neutral-500'>
                {t('hotVoteAllLoaded', '已显示全部动态')}
              </div>
            )}
          </div>
        </div>
      </div>,
      portalHost
    );
  }
);

export default VoteAllModal;
