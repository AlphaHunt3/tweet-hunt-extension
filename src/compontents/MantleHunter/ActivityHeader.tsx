import React from 'react';
import { ChevronDown, Info } from 'lucide-react';
import { useI18n } from '~contents/hooks/i18n.ts';
import { openNewTab } from '~contents/utils';
// import { useLocalStorage } from '~storage/useLocalStorage';

interface ActivityHeaderProps {
  isRegisteredState: boolean;
  defaultExpanded: boolean;
  isExpandedManual: boolean | null;
  setIsExpandedManual: (setter: any) => void;
  handleOpenGuide: () => void;
}

export function ActivityHeader({
  isRegisteredState,
  defaultExpanded,
  isExpandedManual,
  setIsExpandedManual,
  handleOpenGuide,
}: ActivityHeaderProps) {
  const { t } = useI18n();
  // const [theme] = useLocalStorage('@xhunt/theme', 'dark');

  return (
    <div className='px-1 pb-3 pt-1'>
      {/* 第一行：标题 */}
      <div className='w-full mb-4'>
        <div
          className='relative flex items-center overflow-hidden rounded-lg px-4 pt-3 pb-1'
          // style={{
          //   background:
          //     'linear-gradient(135deg, rgba(59, 130, 246, 0.02) 0%, rgba(147, 51, 234, 0.01) 50%, rgba(236, 72, 153, 0.02) 100%)',
          // }}
        >
          {/* 左侧装饰
          <div className='flex items-center justify-end pr-3 min-w-0 flex-shrink-0'>
            <div className='h-px bg-gradient-to-r from-transparent to-orange-400/30 flex-1 max-w-16'></div>
            <div
              className='w-1.5 h-1.5 rounded-full bg-blue-400/50 animate-pulse'
              style={{ animationDuration: '2s' }}
            />
          </div> */}

          {/* 中心标题 - 绝对居中 */}
          <div className='absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-2'>
            <span className='text-base font-bold whitespace-nowrap theme-text-primary'>
              {t('mantleHunterActivityTitle')}
            </span>
            <span>🎉</span>
          </div>

          {/* 右侧装饰
          <div className='flex items-center justify-start pl-3 min-w-0 flex-shrink-0'>
            <div
              className='w-1.5 h-1.5 rounded-full bg-blue-400/40 animate-pulse'
              style={{ animationDelay: '0.5s' }}
            />
            <div className='h-px bg-gradient-to-l from-transparent to-blue-400/30 flex-1 max-w-16'></div>
          </div> */}
        </div>
      </div>

      {/* 第二行：Logo + 描述 + 按钮 */}
      <div className='flex items-center justify-between w-full'>
        {/* 左侧：Logo + 描述 */}
        <div className='flex items-center gap-3'>
          {/* Logo */}
          <div className='flex items-center -space-x-2'>
            <button
              type='button'
              onClick={() => openNewTab('https://x.com/Mantle_Official')}
              title={t('mantleHunterMantleOfficial')}
              className='relative w-8 h-8 rounded-full ring-1 ring-orange-400/20 hover:ring-orange-400/50 transition-transform hover:scale-105 cursor-pointer focus:outline-none'
            >
              <img
                src='https://pbs.twimg.com/profile_images/1891836818850709509/290NJBzU_400x400.jpg'
                alt={t('mantleHunterMantleOfficial')}
                className='w-8 h-8 rounded-full'
                referrerPolicy='no-referrer'
              />
              <span className='sr-only'>{t('mantleHunterMantleOfficial')}</span>
            </button>
            <button
              type='button'
              onClick={() => openNewTab('https://x.com/xhunt_ai')}
              title={t('mantleHunterXHunt')}
              className='relative w-8 h-8 rounded-full ring-1 ring-blue-400/20 hover:ring-blue-400/50 transition-transform hover:scale-105 cursor-pointer focus:outline-none'
            >
              <img
                src='https://pbs.twimg.com/profile_images/1957373648488263681/blkhPYP8_400x400.jpg'
                alt={t('mantleHunterXHunt')}
                className='w-8 h-8 rounded-full'
                referrerPolicy='no-referrer'
              />
              <span className='sr-only'>{t('mantleHunterXHunt')}</span>
            </button>
            <div
              className='w-1.5 h-1.5 rounded-full bg-purple-400/50 animate-pulse'
              style={{ animationDelay: '1s', animationDuration: '2s' }}
            />
          </div>

          {/* 描述信息 */}
          <div className='flex items-center gap-1'>
            <span className='text-xs theme-text-secondary whitespace-nowrap'>
              {isRegisteredState
                ? t('mantleHunterSuccessfullyRegistered')
                : t('mantleHunterCompleteTasksToJoin')}
            </span>
            <div className='relative group'>
              <Info
                className='w-3 h-3 text-blue-400/60 hover:text-blue-400 cursor-help transition-colors'
                onClick={handleOpenGuide}
              />
              <div className='absolute bottom-full right-0 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg z-10 whitespace-nowrap'>
                {t('mantleHunterInfoClickToViewGuide')}
                <div className='absolute top-full right-0 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-800'></div>
              </div>
            </div>
          </div>
          <div className='absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-400/30 to-transparent' />
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
    </div>
  );
}
