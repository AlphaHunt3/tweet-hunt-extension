import React from 'react';
import { Vote, X } from 'lucide-react';
import { useI18n } from '~contents/hooks/i18n';

export interface HotTopicHeaderProps {
  domain?: 'web3' | 'ai';
  title?: string;
  icon?: React.ReactNode;
  iconBg?: string;
  iconShadow?: string;
  onClose?: () => void;
  className?: string;
  rightExtra?: React.ReactNode;
}

const DEFAULT_VOTE_BG =
  'linear-gradient(135deg, rgba(249, 115, 22, 0.98) 0%, rgba(239, 68, 68, 0.92) 55%, rgba(168, 85, 247, 0.88) 100%)';
const DEFAULT_VOTE_SHADOW =
  'rgba(249, 115, 22, 0.22) 0px 8px 18px, rgba(255, 255, 255, 0.35) 0px 1px 0px inset';

export const VoteIcon: React.FC<{ className?: string }> = ({
  className = 'w-3.5 h-3.5',
}) => <Vote className={className} />;

export const HotTopicHeader: React.FC<HotTopicHeaderProps> = React.memo(
  ({
    domain = 'web3',
    title,
    icon,
    iconBg = DEFAULT_VOTE_BG,
    iconShadow = DEFAULT_VOTE_SHADOW,
    onClose,
    className = '',
    rightExtra,
  }) => {
    const { t } = useI18n();

    const displayTitle = title || t('hotVoteHeaderTitle', '热点投票');

    return (
      <div
        className={`flex items-center justify-between gap-2 px-3 pt-3 pb-1.5 flex-shrink-0 ${className}`}
      >
        <h3 className='min-w-0 flex items-center gap-1.5 text-sm font-bold theme-text-primary whitespace-nowrap overflow-hidden text-ellipsis tracking-[-0.01em]'>
          <span
            className='w-6 h-6 rounded-lg flex items-center justify-center shrink-0'
            style={{
              color: 'rgb(255, 255, 255)',
              background: iconBg,
              boxShadow: iconShadow,
            }}
          >
            {icon || <Vote className='w-3.5 h-3.5' />}
          </span>
          <span className='min-w-0 overflow-hidden text-ellipsis'>
            {displayTitle}
          </span>
        </h3>

        <div className='flex items-center gap-1 shrink-0'>
          {rightExtra}
          {onClose && (
            <button
              type='button'
              onClick={onClose}
              aria-label={t('close', '关闭')}
              title={t('close', '关闭')}
              className='w-7 h-7 flex items-center justify-center rounded-xl theme-hover theme-text-secondary hover:theme-text-primary transition-colors cursor-pointer'
            >
              <X className='w-3.5 h-3.5' />
            </button>
          )}
        </div>
      </div>
    );
  }
);

export default HotTopicHeader;
