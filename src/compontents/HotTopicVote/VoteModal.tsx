import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import { useI18n } from '~contents/hooks/i18n';
import { useLocalStorage } from '~storage/useLocalStorage';
import type { HotVoteTopic } from './types';
import { useAnchorPosition } from './useAnchorPosition';
import { useLockBodyScroll } from './useLockBodyScroll';
import { useHotVotePortalHost } from './useHotVotePortalHost';

interface VoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: HotVoteTopic;
  selectedOptionId: string | null;
  isLoggedIn?: boolean;
  isSubmitting: boolean;
  hasVoted: boolean;
  votedOptionId: string | null;
  initialIsAnonymous?: boolean;
  /** 已投票时反显的最近一次留言内容 */
  initialComment?: string;
  submitError?: string | null;
  onSubmit: (params: {
    optionId: string;
    commentContent?: string;
    isAnonymous?: boolean;
  }) => Promise<boolean>;
  onTriggerLogin?: () => void;
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

export const VoteModal: React.FC<VoteModalProps> = React.memo(
  ({
    isOpen,
    onClose,
    topic,
    selectedOptionId,
    isSubmitting,
    hasVoted,
    votedOptionId,
    initialIsAnonymous = false,
    initialComment = '',
    submitError,
    onSubmit,
    anchorRef,
  }) => {
    const { t } = useI18n();
    const [theme] = useLocalStorage('@xhunt/theme', 'dark');
    const supportPrefix = t('hotVoteSupportPrefix', '支持');
    const [commentContent, setCommentContent] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    const isModalActive = Boolean(isOpen && selectedOptionId);

    // 渲染到文档级 shadow host（z-index 置顶），避免被 X 时间线列的层叠上下文压住
    const portalHost = useHotVotePortalHost(isModalActive);

    // 弹框打开时禁用网页滚动，关闭时恢复
    useLockBodyScroll(isModalActive);

    const position = useAnchorPosition({
      anchorRef,
      containerRef,
      modalRef,
      isOpen: isModalActive,
      defaultHeight: 200,
      minMarginTop: 80,
      minMarginBottom: 80,
    });

    useEffect(() => {
      if (isOpen) {
        // 已投票（改票/补发观点）时反显上次留言；首次投票保持空
        setCommentContent(hasVoted ? initialComment : '');
        setIsAnonymous(initialIsAnonymous);
      }
    }, [isOpen, initialIsAnonymous, hasVoted, initialComment]);

    if (!isOpen || !selectedOptionId || !portalHost) return null;

    const selectedOption = topic.options.find((o) => o.id === selectedOptionId);

    // 选项名由后端完整下发，前端剥离“支持”前缀并做空值兜底
    const getOptionDisplayName = (name?: string, isGua?: boolean): string => {
      if (!name) return isGua ? t('hotVoteGua', '吃瓜') : '';
      return isGua ? t('hotVoteGua', '吃瓜') : cleanEntityName(name, supportPrefix);
    };

    const hasComment = commentContent.trim().length > 0;

    const handleSubmit = async () => {
      if (!selectedOptionId || isSubmitting) return;
      const ok = await onSubmit({
        optionId: selectedOptionId,
        commentContent: hasComment ? commentContent.trim() : hasVoted ? '' : undefined,
        isAnonymous,
      });
      if (ok) {
        onClose();
      }
    };

    // 按钮文案
    let submitButtonText = t('hotVoteConfirmVote', '确认投票');
    if (hasVoted && selectedOptionId === votedOptionId) {
      submitButtonText = t('hotVotePostOpinion', '发表观点');
    } else if (hasVoted) {
      submitButtonText = t('hotVoteModifyVote', '修改');
    } else if (hasComment) {
      submitButtonText = t('hotVoteVoteAndPublish', '投票并发表');
    }

    const displayName = getOptionDisplayName(selectedOption?.name, selectedOption?.isGua);

    return createPortal(
      <div
        ref={containerRef}
        data-theme={theme}
        className='fixed inset-0 z-[999990] flex flex-col items-center justify-center select-none pointer-events-auto overscroll-contain'
        onWheel={(e) => e.stopPropagation()}
      >
        {/* 背景轻量半透明遮罩：遮罩覆盖整个背部 */}
        <div
          className='absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity'
          onClick={() => {
            if (!isSubmitting) onClose();
          }}
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
          className='relative z-10 w-full max-w-[330px] bg-white dark:bg-[#151921] theme-text-primary rounded-2xl border border-black/10 dark:border-white/10 shadow-2xl p-4 flex flex-col gap-3 overflow-hidden shrink-0'
          onClick={(e) => e.stopPropagation()}
        >
          {/* 顶栏：已选立场胶囊靠左，关闭按钮靠右，所有选项一致对待，无额外标题行 */}
          <div className='flex items-center justify-between gap-1.5'>
            <span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-black/[0.08] dark:border-white/[0.1] bg-black/[0.04] dark:bg-white/[0.06] theme-text-primary font-semibold text-xs select-none max-w-[250px]'>
              {selectedOption?.avatar && (
                <img
                  src={selectedOption.avatar}
                  alt=''
                  className='w-3.5 h-3.5 rounded-full object-cover shrink-0'
                />
              )}
              <span className='truncate'>{displayName}</span>
            </span>

            <button
              type='button'
              disabled={isSubmitting}
              onClick={onClose}
              aria-label={t('close', '关闭')}
              className='p-1 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.08] theme-text-secondary hover:theme-text-primary transition-colors shrink-0 cursor-pointer'
            >
              <X className='w-4 h-4' />
            </button>
          </div>

          {/* 理由/留言输入区：默认两行高度的多行文本域 */}
          <div className='relative flex flex-col px-3 pt-2 pb-1.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] focus-within:border-blue-500/80 dark:focus-within:border-blue-400/80 focus-within:ring-1 focus-within:ring-blue-500/20 dark:focus-within:ring-blue-400/20 transition-all'>
            <textarea
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value.slice(0, 200))}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !isSubmitting && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
              placeholder={t('hotVoteCommentPlaceholder', '说说你的理由（选填）')}
              maxLength={200}
              rows={2}
              className='w-full text-xs leading-snug bg-transparent border-none outline-none resize-none theme-text-primary placeholder:text-slate-400 dark:placeholder:text-neutral-500 h-[36px]'
            />
            <div className='flex justify-end items-center select-none pt-0.5'>
              <span
                className={`text-[9px] ${
                  commentContent.length >= 190
                    ? 'text-rose-400 font-bold'
                    : 'text-slate-400/70 dark:text-neutral-500'
                }`}
              >
                {commentContent.length}/200
              </span>
            </div>
          </div>

          {/* 底部操作行：匿名勾选与取消、提交按钮放置在同一行 */}
          <div className='flex items-center justify-between select-none pt-0.5'>
            <label
              title={t('hotVoteAnonymousNotice', '（将隐藏您的推特号和头像）')}
              className='inline-flex items-center gap-1.5 cursor-pointer text-xs theme-text-secondary hover:theme-text-primary transition-colors'
            >
              <input
                type='checkbox'
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className='w-3.5 h-3.5 rounded border-slate-400/50 dark:border-white/20 bg-transparent text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-blue-500'
              />
              <span className='text-[11px] font-medium'>
                {t('hotVoteAnonymousCheckbox', '匿名投票')}
              </span>
            </label>

            <div className='flex items-center gap-1.5'>
              <button
                type='button'
                disabled={isSubmitting}
                onClick={onClose}
                className='px-2.5 py-1.5 rounded-lg text-xs font-medium theme-text-secondary hover:theme-text-primary hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors cursor-pointer'
              >
                {t('cancel', '取消')}
              </button>
              <button
                type='button'
                disabled={isSubmitting}
                onClick={handleSubmit}
                className='inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer'
              >
                {isSubmitting ? (
                  <Loader2 className='w-3 h-3 animate-spin' />
                ) : null}
                <span>{submitButtonText}</span>
              </button>
            </div>
          </div>

          {/* 提交失败提示：按钮下方红字展示接口返回的错误信息 */}
          {submitError && (
            <div className='text-[11px] text-rose-400 leading-snug px-0.5 break-words'>
              {submitError}
            </div>
          )}

          {/* 规则说明提示小字 */}
          <div className='text-[10px] text-slate-400/80 dark:text-neutral-500 text-center select-none pt-1 border-t border-black/[0.04] dark:border-white/[0.04] leading-tight'>
            {t('hotVoteInfluenceWeightedTip', '* 采用 XHunt 影响力加权计票')}
          </div>
        </div>
      </div>,
      portalHost
    );
  }
);

export default VoteModal;
