import React, { useState } from 'react';
import { Globe, BookOpen, Calendar, Trophy, Flag } from 'lucide-react';
import { useI18n } from '~contents/hooks/i18n.ts';
import { openNewTab } from '~contents/utils';
import { HunterCampaignConfig } from './types';
import { CampaignTags } from './CampaignTags';
import { isUrlValid } from './utils';

interface RegisteredContentProps {
  inviteCodeState: string;
  invitedCountState: number;
  hunterDataState: {
    mindshare: { rank?: number | null; invites?: number };
    workshare: { rank?: number | null };
  };
  evmAddress: string;
  showMantleHunterComponents: boolean;
  activeUrl: string;
  handleCopyInviteCode: () => void;
  handleOpenGuide: () => void;
  campaignConfig?: HunterCampaignConfig;
}

export function RegisteredContent({
  hunterDataState,
  evmAddress,
  campaignConfig,
}: RegisteredContentProps) {
  const { t, lang } = useI18n();

  const formatDate = (iso?: string | null): string => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    try {
      const locale = lang === 'zh' ? 'zh-CN' : 'en-US';
      return new Intl.DateTimeFormat(locale, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return d.toISOString().slice(5, 10).replace('-', '/');
    }
  };

  const formatRange = (start?: string | null, end?: string | null): string => {
    const s = formatDate(start);
    const e = formatDate(end);
    if (s && e) return `${s} – ${e}`;
    return s || e || '';
  };

  // 判断活动是否已结束
  const isCampaignEnded = (): boolean => {
    if (!campaignConfig?.enrollmentWindow?.endAt) return false;
    const endTime = new Date(campaignConfig.enrollmentWindow.endAt).getTime();
    return Date.now() > endTime;
  };

  const campaignEnded = isCampaignEnded();

  // 使用配置的翻译键，如果没有配置则使用默认翻译键
  const goToOfficialButtonText = t(
    campaignConfig?.copy?.goToOfficialButtonKey || 'mantleHunterStatusGoToOfficial'
  );
  const [showRankTooltip, setShowRankTooltip] = useState(false);
  const [showEvmTooltip, setShowEvmTooltip] = useState(false);
  // 排名 Tab 切换：'mindshare' | 'pow'
  const [rankTab, setRankTab] = useState<'mindshare' | 'pow'>('mindshare');

  // 底部按钮展示状态
  const hasLeaderboard = campaignConfig?.logos && campaignConfig.logos.length > 0 && isUrlValid(campaignConfig.logos[0].url) && !window.location.href.includes(campaignConfig.logos[0].url) && !campaignConfig?.links?.activeUrl.includes('/leaderboard');
  const hasOfficial = isUrlValid(campaignConfig?.links?.activeUrl);
  const hasGuide = isUrlValid(campaignConfig?.links?.guideUrl);
  const linkCount = (hasLeaderboard ? 1 : 0) + (hasOfficial ? 1 : 0) + (hasGuide ? 1 : 0);
  // 按钮宽度：1个时100%，多个时每行最多2个（50%），奇数时最后一个占满
  const getButtonWidth = (index: number, total: number) => {
    if (total === 1) return 'w-full';
    // 如果是最后一个且是奇数个（3个中的第3个），占满整行
    if (index === total - 1 && total % 2 === 1) return 'w-full';
    return 'w-[calc(50%-3px)]'; // 50%减去gap的一半(3px)
  };

  return (
    <div className='space-y-2.5'>
      {/* 活动关键信息：统一 UnregisteredContent 的 tag 视觉（chip + icon + tooltip），兼容明暗主题 */}
      {campaignConfig && (
        <div
          className={`rounded-lg ${campaignConfig.enrollmentWindow &&
            (campaignConfig.enrollmentWindow.startAt ||
              campaignConfig.enrollmentWindow.endAt)
            ? 'px-2.5 py-2 border theme-border space-y-1.5'
            : 'px-0 py-1.5 bg-white/[0.02]'
            }`}
        >
          <CampaignTags
            campaignConfig={campaignConfig}
            showBorder={
              !!(
                campaignConfig.enrollmentWindow &&
                (campaignConfig.enrollmentWindow.startAt ||
                  campaignConfig.enrollmentWindow.endAt)
              )
            }
          />
          {campaignConfig.enrollmentWindow &&
            (campaignConfig.enrollmentWindow.startAt ||
              campaignConfig.enrollmentWindow.endAt) && (
              <div className='flex items-center justify-between gap-2'>
                <div className='flex items-center gap-1.5 min-w-0'>
                  <div className={`w-4 h-4 flex items-center justify-center rounded-full ${campaignEnded ? 'bg-gray-500/10 text-gray-400' : 'bg-amber-500/10 text-amber-300/90'}`}>
                    {campaignEnded ? <Flag className='w-3 h-3' /> : <Calendar className='w-3 h-3' />}
                  </div>
                  <span className='text-[10px] theme-text-secondary font-medium truncate'>
                    {campaignEnded ? t('ended') : t('mantleHunterActivityTime')}
                  </span>
                </div>
                <div className='text-[10px] theme-text-secondary font-medium truncate'>
                  {formatRange(
                    campaignConfig.enrollmentWindow.startAt,
                    campaignConfig.enrollmentWindow.endAt
                  )}
                </div>
              </div>
            )}
        </div>
      )}

      {/* 状态卡片网格 */}
      <div className='grid grid-cols-2 gap-1.5 relative'>
        {/* 背景装饰层 - 个人数据区域 */}
        <div className='absolute inset-0 bg-gradient-to-r from-blue-500/[0.03] via-purple-500/[0.03] to-pink-500/[0.03] pointer-events-none rounded-lg' />
        <div className='absolute inset-0 bg-gradient-to-br from-transparent via-white/[0.01] to-transparent pointer-events-none rounded-lg' />

        {/* Mindshare/POW Rank */}
        <div className='py-2 rounded-lg bg-white/[0.02] transition-all duration-200 relative group z-10 hover:bg-white/[0.04]'>
          {/* Tab 切换按钮 */}
          {campaignConfig?.enablePowLeaderboard ? (
            <div className='flex items-center justify-center gap-1 mb-0.5'>
              <button
                onClick={() => setRankTab('mindshare')}
                className={`text-[9px] font-medium px-1.5 py-0.5 rounded transition-colors ${rankTab === 'mindshare'
                  ? 'bg-blue-500/20 text-blue-300'
                  : 'theme-text-secondary hover:text-blue-300/70'
                  }`}
              >
                POI
              </button>
              <button
                onClick={() => setRankTab('pow')}
                className={`text-[9px] font-medium px-1.5 py-0.5 rounded transition-colors ${rankTab === 'pow'
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'theme-text-secondary hover:text-amber-300/70'
                  }`}
              >
                POW
              </button>
            </div>
          ) : (
            <div className='text-[9px] theme-text-secondary mb-0.5 font-medium text-center'>
              {t('mantleHunterStatusRank')}
            </div>
          )}
          <div
            className='text-xs theme-text-primary font-bold text-center cursor-pointer leading-tight'
            onMouseEnter={() => setShowRankTooltip(true)}
            onMouseLeave={() => setShowRankTooltip(false)}
          >
            <div className='flex items-center justify-center gap-1'>
              <span className={rankTab === 'mindshare' ? 'text-blue-300' : 'text-amber-300'}>
                #{rankTab === 'mindshare'
                  ? (hunterDataState?.mindshare?.rank ?? '999+')
                  : (hunterDataState?.workshare?.rank ?? '999+')}
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
                {campaignConfig?.enablePowLeaderboard && (
                  <div className='flex items-center gap-2'>
                    <div className='w-3 h-3 rounded-full bg-amber-300'></div>
                    <span>
                      Workshare: #{hunterDataState?.workshare?.rank ?? '999+'}
                    </span>
                  </div>
                )}
              </div>
              <div className='absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900'></div>
            </div>
          )}
        </div>

        {/* EVM Address */}
        <div className='py-2 rounded-lg bg-white/[0.02] transition-all duration-200 relative group z-10 hover:bg-white/[0.04]'>
          <div className='text-[9px] theme-text-secondary mb-0.5 font-medium text-center'>
            {t('mantleHunterBoundAddress')}
          </div>
          <div
            className='text-xs theme-text-primary font-bold text-center font-mono cursor-pointer leading-tight'
            onMouseEnter={() => setShowEvmTooltip(true)}
            onMouseLeave={() => setShowEvmTooltip(false)}
          >
            <div className='flex items-center justify-center gap-1'>
              <span>
                {evmAddress
                  ? `${evmAddress.slice(0, 3)}**${evmAddress.slice(-3)}`
                  : '-'}
              </span>
            </div>
          </div>

          {/* 自定义 tooltip */}
          {showEvmTooltip && evmAddress && (
            <div className='absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50 pointer-events-none whitespace-nowrap'>
              <div className='flex flex-col gap-1.5'>
                <div className='flex items-center gap-2'>
                  <span className='font-mono'>{evmAddress}</span>
                </div>
              </div>
              <div className='absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900'></div>
            </div>
          )}
        </div>
      </div>

      {/* 底部按钮组：排行榜 + 官方页面 + 查看指南 */}
      {linkCount > 0 && (
        <div className='flex flex-wrap gap-1.5'>
          {hasLeaderboard && (
            <a
              href={'#'}
              className={`${getButtonWidth(0, linkCount)} h-8 pl-2.5 pr-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 border theme-border bg-white/[0.02] theme-text-primary hover:bg-amber-500/8 hover:border-amber-500/25 active:scale-[0.98] border-l-2 border-l-amber-500/50`}
              onClick={(e) => {
                e.preventDefault();
                openNewTab(campaignConfig.logos[0].url);
              }}
            >
              <Trophy className='w-3.5 h-3.5 shrink-0 opacity-70' />
              <span className='leading-none truncate'>{t('viewLeaderboard')}</span>
            </a>
          )}
          {hasOfficial && (
            <a
              href={'#'}
              className={`${getButtonWidth(hasLeaderboard ? 1 : 0, linkCount)} h-8 pl-2.5 pr-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 border theme-border bg-white/[0.02] theme-text-primary hover:bg-emerald-500/8 hover:border-emerald-500/25 active:scale-[0.98] border-l-2 border-l-emerald-500/50`}
              onClick={(e) => {
                e.preventDefault();
                openNewTab(campaignConfig?.links?.activeUrl || '#');
              }}
            >
              <Globe className='w-3.5 h-3.5 shrink-0 opacity-70' />
              <span className='leading-none truncate'>{campaignConfig?.links?.activeUrl.includes('/leaderboard') ? t('viewLeaderboard') : goToOfficialButtonText}</span>
            </a>
          )}
          {hasGuide && (
            <a
              href={'#'}
              className={`${getButtonWidth(linkCount - 1, linkCount)} h-8 pl-2.5 pr-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 border theme-border bg-white/[0.02] theme-text-primary hover:bg-violet-500/8 hover:border-violet-500/25 active:scale-[0.98] border-l-2 border-l-violet-500/50`}
              onClick={(e) => {
                e.preventDefault();
                openNewTab(campaignConfig?.links?.guideUrl || '#');
              }}
            >
              <BookOpen className='w-3.5 h-3.5 shrink-0 opacity-70' />
              <span className='leading-none truncate'>
                {t('mantleHunterViewOfficialGuide')}
              </span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}
