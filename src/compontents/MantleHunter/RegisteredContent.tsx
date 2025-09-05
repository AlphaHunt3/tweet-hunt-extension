import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useI18n } from '~contents/hooks/i18n.ts';
import { openNewTab } from '~contents/utils';
import { configManager } from '~utils/configManager';

interface RegisteredContentProps {
  inviteCodeState: string;
  invitedCountState: number;
  hunterDataState: {
    mindshare: { rank?: number | null; invites?: number };
    workshare: { rank?: number | null };
  };
  showMantleHunterComponents: boolean;
  handleCopyInviteCode: () => void;
  handleOpenGuide: () => void;
}

export function RegisteredContent({
  inviteCodeState,
  invitedCountState,
  hunterDataState,
  showMantleHunterComponents,
  handleCopyInviteCode,
  handleOpenGuide,
}: RegisteredContentProps) {
  const { t } = useI18n();
  const [showRankTooltip, setShowRankTooltip] = useState(false);

  return (
    <div className='space-y-3'>
      {/* 状态卡片网格 */}
      <div className='grid grid-cols-3 gap-1.5 relative'>
        {/* 背景装饰层 - 个人数据区域 */}
        <div className='absolute inset-0 bg-gradient-to-r from-blue-500/[0.03] via-purple-500/[0.03] to-pink-500/[0.03] pointer-events-none' />
        <div className='absolute inset-0 bg-gradient-to-br from-transparent via-white/[0.01] to-transparent pointer-events-none' />

        <div className='py-2 rounded-md bg-white/[0.02]  transition-all duration-200 relative group z-10'>
          <div className='text-[10px] theme-text-secondary mb-0.5 font-medium text-center'>
            {t('mantleHunterStatusRank')}
          </div>
          <div
            className='text-xs theme-text-primary font-bold text-center cursor-pointer leading-tight'
            onMouseEnter={() => setShowRankTooltip(true)}
            onMouseLeave={() => setShowRankTooltip(false)}
          >
            <div className='flex items-center justify-center gap-1'>
              <span className='text-blue-300'>
                #{hunterDataState?.mindshare?.rank ?? '999+'}
              </span>
              <span className='text-gray-400'>/</span>
              <span className='text-purple-300'>
                #{hunterDataState?.workshare?.rank ?? '999+'}
              </span>
            </div>
          </div>

          {/* 自定义 tooltip */}
          {showRankTooltip && (
            <div className='absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50 pointer-events-none whitespace-nowrap'>
              <div className='flex flex-col gap-1.5'>
                <div className='flex items-center gap-2'>
                  <div className='w-3 h-3 rounded-full bg-blue-300'></div>
                  <span>
                    Mindshare: #{hunterDataState?.mindshare?.rank ?? '999+'}
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <div className='w-3 h-3 rounded-full bg-purple-300'></div>
                  <span>
                    Workshare: #{hunterDataState?.workshare?.rank ?? '999+'}
                  </span>
                </div>
              </div>
              <div className='absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900'></div>
            </div>
          )}
        </div>
        <div className='py-2 rounded-md bg-white/[0.02]  transition-all duration-200'>
          <div className='text-[10px] theme-text-secondary mb-0.5 font-medium text-center'>
            {t('mantleHunterMyInviteCode')}
          </div>
          <div className='text-xs theme-text-primary font-bold text-center'>
            <div
              onClick={handleCopyInviteCode}
              className='hover:text-blue-400 transition-colors cursor-pointer'
              title={t('mantleHunterClickToCopy')}
            >
              {inviteCodeState || '-'}
            </div>
          </div>
        </div>
        <div className='py-2 rounded-md bg-white/[0.02]  transition-all duration-200'>
          <div className='text-[10px] theme-text-secondary mb-0.5 font-medium text-center'>
            {t('mantleHunterStatusInvitedCount')}
          </div>
          <div className='text-xs theme-text-primary font-bold text-center'>
            {invitedCountState}
          </div>
        </div>
      </div>

      {/* 官方页面按钮 */}
      {!showMantleHunterComponents && (
        <a
          href={'#'}
          className='w-full relative overflow-hidden px-4 py-2 text-xs font-bold rounded-xl transition-all duration-300 flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99] h-8'
          onClick={(e) => {
            e.preventDefault();
            const url = configManager.getMantleHunterProgramActiveURL();
            openNewTab(url || '#');
          }}
        >
          <span className='leading-none'>
            {t('mantleHunterStatusGoToOfficial')}
          </span>
          <ExternalLink className='w-3 h-3 ml-1.5' />
        </a>
      )}
    </div>
  );
}
