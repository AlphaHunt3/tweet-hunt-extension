import React from 'react';
import { ChevronDown, Info } from 'lucide-react';
import { useI18n } from '~contents/hooks/i18n.ts';
import { openNewTab } from '~contents/utils';
// import { useLocalStorage } from '~storage/useLocalStorage';
import { HunterCampaignLogo } from './types';

interface ActivityHeaderProps {
  isRegisteredState: boolean;
  defaultExpanded: boolean;
  isExpandedManual: boolean | null;
  setIsExpandedManual: (setter: any) => void;
  handleOpenGuide: () => void;
  shortTitle?: string; // 简短标题，用于外部列表展示
  fullTitle?: string; // 完整标题，用于展开后的内容区域
  emoji?: string;
  logos?: HunterCampaignLogo[];
  registeredDescription?: string;
  unregisteredDescription?: string;
  isContentVisible?: boolean; // 是否展开，用于决定是否显示完整标题区域
}

export function ActivityHeader({
  isRegisteredState,
  defaultExpanded,
  isExpandedManual,
  setIsExpandedManual,
  handleOpenGuide,
  shortTitle,
  fullTitle,
  emoji,
  logos = [],
  isContentVisible = false,
}: ActivityHeaderProps) {
  const { t } = useI18n();
  // const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const displayShortTitle = shortTitle || t('mantleHunterActivityTitle');
  const allLogos = logos.length > 0 ? logos : [];
  // 只展示活动方的 logo，过滤掉 xhunt 的 logo
  const logosToRender = allLogos.filter(
    (logo) => !logo.url.includes('xhunt_ai') && !logo.url.includes('xhunt.ai')
  );

  return (
    <div className='px-1 pt-1'>
      {/* Logo + 标题 + 按钮 */}
      <div className='flex items-center justify-between w-full relative'>
        {/* 左侧：Logo + 标题 */}
        <div className='flex items-center gap-3'>
          {/* Logo - 展开后使用透明度隐藏并禁用点击 */}
          <div
            className={`flex items-center -space-x-2 ${
              // isContentVisible ? 'opacity-0 pointer-events-none' : 'opacity-100'
              'opacity-100'
            }`}
          >
            {logosToRender.map((logo) => (
              <button
                key={logo.url}
                type='button'
                onClick={() => openNewTab(logo.url)}
                title={logo.label}
                // disabled={isContentVisible}
                className={`relative w-8 h-8 rounded-full ring-1 transition-transform hover:scale-105 cursor-pointer focus:outline-none ${
                  logo.ringClassName ||
                  'ring-blue-400/20 hover:ring-blue-400/50'
                }`}
              >
                <img
                  src={logo.image}
                  alt={logo.label}
                  className='w-8 h-8 rounded-full'
                  referrerPolicy='no-referrer'
                />
                <span className='sr-only'>{logo.label}</span>
              </button>
            ))}
            <div
              className='w-1.5 h-1.5 rounded-full bg-purple-400/50 animate-pulse'
              style={{ animationDelay: '1s', animationDuration: '2s' }}
            />
          </div>

          {/* 简短标题信息 - 仅在未展开时显示 */}
          {
            <div
              className='flex items-center gap-1 cursor-pointer'
              onClick={() =>
                setIsExpandedManual((prev: boolean | null) =>
                  prev === null ? !defaultExpanded : !prev
                )
              }
            >
              <span className='text-sm font-bold theme-text-primary whitespace-nowrap'>
                {displayShortTitle}
              </span>
            </div>
          }
        </div>

        {/* 右侧：展开/收起按钮 */}
        {(!isRegisteredState || isRegisteredState) && (
          <button
            type='button'
            onClick={() =>
              setIsExpandedManual((prev: boolean | null) =>
                prev === null ? !defaultExpanded : !prev
              )
            }
            className='relative inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-orange-500/10 via-blue-500/10 to-purple-500/10 border border-white/15 hover:border-white/25 text-white transition-all duration-300 scale-[0.9] overflow-hidden group'
          >
            {/* 背景装饰 */}
            <div className='absolute inset-0 bg-gradient-to-r from-orange-400/5 via-blue-400/5 to-purple-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
            <div className='absolute inset-0 bg-gradient-to-br from-transparent via-white/[0.02] to-transparent' />

            {/* 动态光点 */}
            <div className='absolute top-0.5 left-2 w-1 h-1 bg-orange-400/40 rounded-full animate-pulse' />
            <div
              className='absolute bottom-0.5 right-2 w-0.5 h-0.5 bg-purple-400/40 rounded-full animate-pulse'
              style={{ animationDelay: '0.5s' }}
            />

            <span className='relative z-10 bg-gradient-to-r from-orange-400 via-blue-400 to-purple-400 bg-clip-text text-transparent font-bold'>
              {(isExpandedManual !== null ? isExpandedManual : defaultExpanded)
                ? t('mantleHunterHide')
                : isRegisteredState
                ? t('mantleHunterExpand')
                : t('mantleHunterParticipate')}
            </span>
            <ChevronDown
              className={`relative z-10 w-3.5 h-3.5 text-blue-400 transition-all duration-300 ${
                (isExpandedManual !== null ? isExpandedManual : defaultExpanded)
                  ? 'rotate-180'
                  : ''
              }`}
            />
          </button>
        )}
      </div>

      {/* 展开后的完整标题区域 */}
      {isContentVisible && <div className='w-full mb-2 mt-2' />}
    </div>
  );
}
