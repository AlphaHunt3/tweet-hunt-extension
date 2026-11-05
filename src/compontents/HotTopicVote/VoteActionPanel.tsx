import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useI18n } from '~contents/hooks/i18n';
import type { HotVoteOption } from './types';

interface VoteActionPanelProps {
  options: HotVoteOption[];
  onVote: (optionId: string) => Promise<void>;
  isSubmitting: boolean;
  isRevoting?: boolean;
  onCancelRevote?: () => void;
  currentOptionId?: string | null;
  topicType?: 'person_pk' | 'general_topic';
}

/** 剥离“支持”前缀，提取实体纯名称（用于首字母展示等） */
function cleanEntityName(name: string, supportPrefix: string = '支持'): string {
  if (!name) return '';
  const trimmed = supportPrefix.trim();
  let cleaned = name.trim();
  if (cleaned.toLowerCase().startsWith(trimmed.toLowerCase())) {
    cleaned = cleaned.slice(trimmed.length).trim();
  }
  return cleaned || name;
}

const OptionMiniAvatar: React.FC<{
  name: string;
  avatar?: string;
  supportPrefix: string;
}> = React.memo(({ name, avatar, supportPrefix }) => {
  const [hasError, setHasError] = useState(false);
  const pureName = cleanEntityName(name, supportPrefix);
  const initial = (pureName || '?').slice(0, 1).toUpperCase();

  return (
    <div className='w-[18px] h-[18px] rounded-full overflow-hidden shrink-0 flex items-center justify-center font-bold text-[9.5px] bg-slate-200/80 dark:bg-white/10 theme-text-secondary select-none border border-black/[0.06] dark:border-white/10'>
      {avatar && !hasError ? (
        <img
          src={avatar}
          alt={pureName}
          className='w-full h-full object-cover rounded-full'
          onError={() => setHasError(true)}
        />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
});

export const VoteActionPanel: React.FC<VoteActionPanelProps> = React.memo(
  ({
    options,
    onVote,
    isSubmitting,
    isRevoting = false,
    onCancelRevote,
    currentOptionId,
  }) => {
    const { t } = useI18n();
    const [pendingOptionId, setPendingOptionId] = useState<string | null>(null);

    const supportPrefix = t('hotVoteSupportPrefix', '支持');

    // 选项名由后端完整下发，前端只做空值兜底，不再自行拼接前缀
    const getOptionDisplayName = (name?: string, isGua?: boolean): string => {
      if (!name) return isGua ? t('hotVoteGua', '吃瓜') : '';
      return name;
    };

    const handleVoteClick = async (optionId: string) => {
      setPendingOptionId(optionId);
      try {
        await onVote(optionId);
      } finally {
        setPendingOptionId(null);
      }
    };

    const isSingleOption = options.length === 1;

    return (
      <div className='flex flex-col gap-1.5'>
        {isRevoting && (
          <div className='flex items-center justify-between text-[11px] pb-0.5'>
            <span className='theme-text-secondary font-medium'>
              {t('hotVoteSelectNewOption', '请选择新选项：')}
            </span>
            {onCancelRevote && (
              <button
                type='button'
                onClick={onCancelRevote}
                className='text-[11px] text-blue-400 hover:underline'
              >
                {t('cancel', '取消')}
              </button>
            )}
          </div>
        )}

        {/* 所有选项一视同仁，统一网格布局，一行 2 个展示，4 个时对称 2x2 对齐 */}
        <div
          className={
            isSingleOption
              ? 'grid grid-cols-1 gap-1.5'
              : 'grid grid-cols-2 gap-1.5'
          }
        >
          {options.map((opt, idx) => {
            const isSelected = opt.id === currentOptionId;
            const isThisSubmitting = isSubmitting && pendingOptionId === opt.id;
            const displayName = getOptionDisplayName(opt.name, opt.isGua);

            // 奇数个选项时，最后一个选项铺满全宽
            const isSpanFull =
              options.length % 2 === 1 && idx === options.length - 1;

            return (
              <button
                key={opt.id}
                type='button'
                disabled={isSubmitting}
                onClick={() => handleVoteClick(opt.id)}
                title={displayName}
                className={`${
                  isSpanFull ? 'col-span-2 w-full' : 'col-span-1 w-full min-w-0'
                } flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all active:scale-[0.98] ${
                  isSelected
                    ? 'border-blue-500 dark:border-blue-400 bg-blue-500/15 dark:bg-blue-500/20 text-blue-500 dark:text-blue-400 shadow-xs'
                    : 'border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.035] hover:bg-slate-100/70 dark:hover:bg-white/[0.06] hover:border-blue-400/60 dark:hover:border-blue-400/50 hover:text-blue-600 dark:hover:text-blue-400 theme-text-primary'
                } ${isSubmitting ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {isThisSubmitting ? (
                  <Loader2 className='w-3.5 h-3.5 animate-spin text-blue-400' />
                ) : (
                  <>
                    {opt.avatar && (
                      <OptionMiniAvatar
                        name={opt.name}
                        avatar={opt.avatar}
                        supportPrefix={supportPrefix}
                      />
                    )}
                    <span className='truncate font-semibold text-[11.5px] leading-tight'>
                      {displayName}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
);

export default VoteActionPanel;
