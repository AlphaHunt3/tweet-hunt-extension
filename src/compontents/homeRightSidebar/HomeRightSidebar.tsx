import React from 'react';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useUserDomain } from '~contents/hooks/useUserDomain';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { AiHomeSidebar } from './AiHomeSidebar';
import { Web3HomeSidebar } from './Web3HomeSidebar';

export interface HomeRightSidebarProps {
  className?: string;
}

export function HomeRightSidebar({ className = '' }: HomeRightSidebarProps) {
  const { t } = useI18n();
  const { hasBoth, hasWeb3, hasAi, primaryDomain } = useUserDomain();

  // 用户主动切换的领域（localStorage，跨新开 tab 保留）
  const [savedActiveDomain, setSavedActiveDomain] = useLocalStorage<
    'web3' | 'ai' | null
  >('@xhunt/active-domain', null);

  const [activeDomain, setActiveDomain] = React.useState<'web3' | 'ai'>(
    savedActiveDomain || primaryDomain,
  );

  // 当用户修改首选领域后，同步更新当前激活的面
  // 但如果已有主动切换记录，则保持用户选择，并支持新 tab 水合后恢复
  React.useEffect(() => {
    setActiveDomain(savedActiveDomain || primaryDomain);
  }, [primaryDomain, savedActiveDomain]);

  // 用户主动切换领域：更新 state + localStorage
  const handleSwitchDomain = React.useCallback(
    (domain: 'web3' | 'ai') => {
      setActiveDomain(domain);
      setSavedActiveDomain(domain);
    },
    [setSavedActiveDomain],
  );

  const [isSwitcherHovering, setIsSwitcherHovering] = React.useState(false);
  const hoverTimerRef = React.useRef<number | null>(null);

  const [clickCount, setClickCount] = useLocalStorage(
    '@xhunt/domain-capsule-click-count',
    0,
  );
  const isSwitcherExpanded = isSwitcherHovering || clickCount < 1;

  const handleSwitcherMouseEnter = React.useCallback(() => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setIsSwitcherHovering(true);
  }, []);

  const handleSwitcherMouseLeave = React.useCallback(() => {
    hoverTimerRef.current = window.setTimeout(() => {
      setIsSwitcherHovering(false);
    }, 180);
  }, []);

  const markSwitcherClicked = React.useCallback(() => {
    if (clickCount < 2) {
      setClickCount(clickCount + 1);
    }
  }, [clickCount, setClickCount]);

  React.useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        window.clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  const web3Content = <Web3HomeSidebar className={className} />;
  const aiContent = <AiHomeSidebar />;

  if (!hasBoth) {
    if (hasWeb3) return web3Content;
    if (hasAi) return aiContent;
    return null;
  }

  const web3Label = t('domainWeb3') || 'Web3';
  const aiLabel = t('domainAi') || 'AI';

  return (
    <div
      className={`rounded-xl ${className} relative overflow-visible flex flex-col w-[350px]`}
    >
      {/* 右侧外置领域切换器：不覆盖主容器边框，透明热区更大，hover 后向外展开 */}
      <div
        className='absolute left-full top-3 z-30 ml-0.5 h-[96px] overflow-hidden rounded-2xl transition-[width] duration-200 ease-out'
        onMouseEnter={handleSwitcherMouseEnter}
        onMouseLeave={handleSwitcherMouseLeave}
        style={{ width: isSwitcherExpanded ? '78px' : '24px' }}
      >
        <div
          className={`absolute left-0 top-2 flex h-[76px] w-[78px] items-stretch rounded-2xl theme-bg-secondary p-1.5 transition-all duration-200 ${isSwitcherExpanded ? 'theme-border border' : 'border border-transparent'}`}
          style={{
            background: isSwitcherExpanded
              ? 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 62%), var(--bg-secondary)'
              : 'transparent',
            // boxShadow: isSwitcherExpanded
            //   ? '0 8px 20px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.12)'
            //   : 'none',
          }}
        >
          <div className='flex w-[4px] shrink-0 items-center justify-center'>
            <span
              className='h-10 w-[3px] rounded-full transition-all duration-200'
              style={{
                background:
                  activeDomain === 'web3'
                    ? 'linear-gradient(180deg, rgba(29,155,240,0.72) 0%, rgba(168,85,247,0.68) 100%)'
                    : 'linear-gradient(180deg, rgba(16,185,129,0.72) 0%, rgba(52,211,153,0.66) 100%)',
              }}
            />
          </div>

          <div
            className={`flex flex-1 flex-col justify-center gap-1.5 pl-1 transition-opacity duration-150 ${isSwitcherExpanded ? 'opacity-100' : 'opacity-0'}`}
            style={{ pointerEvents: isSwitcherExpanded ? 'auto' : 'none' }}
          >
            <button
              type='button'
              tabIndex={isSwitcherExpanded ? 0 : -1}
              onClick={() => {
                markSwitcherClicked();
                handleSwitchDomain('web3');
              }}
              className={`flex h-7 items-center justify-center rounded-xl px-1.5 text-xs font-semibold transition-all duration-200 whitespace-nowrap ${activeDomain === 'web3'
                ? ''
                : 'theme-text-secondary hover:theme-text-primary hover:bg-slate-500/10'
                }`}
              style={
                activeDomain === 'web3'
                  ? {
                    color: '#1D9BF0',
                    background:
                      'linear-gradient(135deg, rgba(29,155,240,0.13) 0%, rgba(168,85,247,0.10) 100%)',
                    border: '1px solid rgba(29,155,240,0.18)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)',
                  }
                  : { border: '1px solid transparent' }
              }
            >
              <span>{web3Label}</span>
            </button>

            <button
              type='button'
              tabIndex={isSwitcherExpanded ? 0 : -1}
              onClick={() => {
                markSwitcherClicked();
                handleSwitchDomain('ai');
              }}
              className={`flex h-7 items-center justify-center rounded-xl px-1.5 text-xs font-semibold transition-all duration-200 whitespace-nowrap ${activeDomain === 'ai'
                ? ''
                : 'theme-text-secondary hover:theme-text-primary hover:bg-slate-500/10'
                }`}
              style={
                activeDomain === 'ai'
                  ? {
                    color: '#10b981',
                    background:
                      'linear-gradient(135deg, rgba(16,185,129,0.13) 0%, rgba(52,211,153,0.10) 100%)',
                    border: '1px solid rgba(16,185,129,0.18)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)',
                  }
                  : { border: '1px solid transparent' }
              }
            >
              <span>{aiLabel}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3D 翻转内容区 */}
      <div className='relative' style={{ perspective: '1200px' }}>
        <div
          className='w-full'
          style={{
            position: 'relative',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)',
            transform:
              activeDomain === 'ai' ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Web3 正面 */}
          <div
            className={`w-full ${activeDomain === 'web3' ? 'relative' : 'absolute top-0 left-0'}`}
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              pointerEvents: activeDomain === 'web3' ? 'auto' : 'none',
            }}
          >
            {web3Content}
          </div>
          {/* AI 背面 */}
          <div
            className={`w-full ${activeDomain === 'ai' ? 'relative' : 'absolute top-0 left-0'}`}
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              pointerEvents: activeDomain === 'ai' ? 'auto' : 'none',
            }}
          >
            {aiContent}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomeRightSidebar;
