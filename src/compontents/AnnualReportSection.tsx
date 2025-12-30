import React from 'react';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useLocalStorage } from '~storage/useLocalStorage';
import { Snowflake, ExternalLink } from 'lucide-react';
import Lottie from 'lottie-react';
import christmasCardAnimation from '~lottie/christmas-card.json';
import {
  checkAnnualReportWhitelist,
  checkAnnualReportId,
  registerAnnualReport,
  type AnnualReportResponse,
} from '~contents/services/api';
import { useRequest, useLockFn } from 'ahooks';
import type { TwitterInitialStateCurrentUser } from '~types';

export function AnnualReportSection() {
  const { t } = useI18n();
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const [username] = useLocalStorage('@xhunt/current-username', '');
  const [userInfo] = useLocalStorage<TwitterInitialStateCurrentUser | null>(
    '@xhunt/initial-state-current-user',
    null
  );

  const [inviteInput, setInviteInput] = React.useState('');
  const [isGeneratingReport, setIsGeneratingReport] = React.useState(false);
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);
  const [revealed, setRevealed] = React.useState(false);
  const [avatarUrl, setAvatarUrl] = React.useState('');
  const [isInputFocused, setIsInputFocused] = React.useState(false);
  // const [animationPlayCount, setAnimationPlayCount] = React.useState(0);
  const [isHovered, setIsHovered] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string>('');
  const lottieRef = React.useRef<any>(null);
  const playCountRef = React.useRef(0);
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const leaveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // 使用 useRequest 检查白名单状态，当 userInfo?.id_str 变化时自动重新请求
  const userId = userInfo?.id_str;

  // 检查本地 storage 是否已有完整的报告数据（包括 report_id 和 codes）
  const storageKey = userId
    ? `@xhunt/annual-report-${userId}`
    : '@xhunt/annual-report-unknownX01';
  const [cachedReportData, setCachedReportData] =
    useLocalStorage<AnnualReportResponse | null>(storageKey, null);

  // 如果本地已有完整数据，则不请求任何接口
  const hasCachedData = !!(
    cachedReportData?.status && cachedReportData.data?.report_id
  );

  // 只有在没有缓存数据时才检查白名单
  const { data: isWhitelisted = false } = useRequest<boolean, []>(
    () =>
      userId ? checkAnnualReportWhitelist(userId) : Promise.resolve(false),
    {
      ready: !!userId && !hasCachedData,
      refreshDeps: [userId, hasCachedData],
      debounceWait: 300,
    }
  );

  // 检查报告是否已生成
  // 如果本地已有完整数据，则不请求接口
  // 第一次运行不需要 isGeneratingReport 条件（需要先查询状态）
  // 后续轮询只有在正在生成时才进行
  const shouldCheck = !hasCachedData && !!userId; // 第一次检查条件
  const shouldPoll = !hasCachedData && userId && isGeneratingReport; // 轮询条件
  const { data: reportData, cancel: cancelPolling } = useRequest<
    AnnualReportResponse | undefined,
    []
  >(
    () => {
      if (!userId) return Promise.resolve(undefined);
      // 每次请求时添加时间戳绕过缓存
      const timestamp = Date.now();
      return checkAnnualReportId(userId, timestamp);
    },
    {
      ready: shouldCheck, // 第一次就可以运行，不需要 isGeneratingReport
      refreshDeps: [userId, shouldCheck, isGeneratingReport],
      debounceWait: 300,
      pollingInterval: shouldPoll ? 15000 : undefined, // 每15秒轮询一次，只在生成中时轮询
      pollingWhenHidden: false, // 页面隐藏时停止轮询
      onSuccess: (data) => {
        if (data?.status && data.data?.report_id) {
          // 报告已生成，保存完整数据到本地 storage 并停止轮询
          setCachedReportData(data);
          setIsGeneratingReport(false);
          cancelPolling();
        } else if (
          data?.status &&
          data.message?.includes('Generating report')
        ) {
          // 正在生成，继续轮询
          setIsGeneratingReport(true);
        }
      },
    }
  );

  // 优先使用缓存数据，否则使用接口返回的数据
  const finalReportData = React.useMemo(() => {
    if (hasCachedData && cachedReportData) {
      return cachedReportData;
    }
    return reportData;
  }, [hasCachedData, cachedReportData, reportData]);

  const normalizeAvatar = React.useCallback((u: string): string => {
    if (!u) return '';
    try {
      // remove twitter size suffixes like _normal, _bigger, _mini, or _400x400
      return u.replace(/_(normal|bigger|mini|\d+x\d+)(\.[a-zA-Z0-9]+)$/i, '$2');
    } catch {
      return u;
    }
  }, []);

  // 根据 userInfo 设置头像 URL
  React.useEffect(() => {
    const url = userInfo?.profile_image_url_https || '';
    setAvatarUrl(url ? normalizeAvatar(url) : '');
  }, [userInfo, normalizeAvatar]);

  // 判断报告是否已生成
  const isReportReady =
    finalReportData?.status && finalReportData.data?.report_id;

  React.useEffect(() => {
    if (isReportReady) {
      const id = requestAnimationFrame(() => setRevealed(true));
      return () => cancelAnimationFrame(id);
    } else {
      setRevealed(false);
    }
  }, [isReportReady]);

  const onUnlock = useLockFn(async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    // 白名单用户可以直接点击，非白名单用户需要输入邀请码
    if (!isWhitelisted && !inviteInput.trim()) {
      setErrorMessage(t('annualReportInviteCodeRequired') || '请输入邀请码');
      return;
    }

    setErrorMessage('');

    try {
      // 统一调用 registerAnnualReport，白名单用户不传 invite_code
      const registerResult = await registerAnnualReport({
        handle: username || userInfo?.screen_name || '',
        user_id: userId!,
        invite_code: isWhitelisted ? undefined : inviteInput.trim(),
      });

      if (registerResult?.status) {
        // 注册成功，清除本地缓存，后台正在生成
        if (storageKey) {
          setCachedReportData(null);
        }
        setIsGeneratingReport(true);
        setInviteInput('');
        // useRequest 会自动开始轮询（shouldPoll 变为 true 后会自动触发）
      } else {
        // 注册失败
        setErrorMessage(
          registerResult?.message ||
            t('annualReportRegistrationFailed') ||
            '注册失败，请检查邀请码是否正确'
        );
      }
    } catch (err) {
      setErrorMessage(
        t('annualReportRegistrationError') || '注册失败，请稍后重试'
      );
    }
  });

  const copy = (text: string, idx?: number) => {
    navigator.clipboard.writeText(text).then(() => {
      if (typeof idx === 'number') {
        setCopiedIndex(idx);
        setTimeout(() => setCopiedIndex(null), 1500);
      }
    });
  };

  // 处理鼠标进入
  const handleMouseEnter = React.useCallback(() => {
    // 清除离开的定时器
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    // 如果已经在展开状态，不需要再设置定时器
    if (isHovered) return;
    // 设置 500ms 延迟后展开
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 500);
  }, [isHovered]);

  // 处理鼠标离开
  const handleMouseLeave = React.useCallback(() => {
    // 清除进入的定时器
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    // 设置 1000ms 延迟后隐藏
    leaveTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 1000);
  }, []);

  // 清理定时器
  React.useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current);
      }
    };
  }, []);

  if (!userId) return null;

  return (
    <div
      data-theme={theme}
      className='relative rounded-t-xl overflow-hidden shadow-sm'
      style={{ borderBottom: '1px solid var(--border-color)' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* header will contain subtle seasonal accents; container remains base style */}
      <div
        className='relative px-3 py-2.5 z-[1]'
        style={{
          background:
            theme === 'light'
              ? 'radial-gradient(1200px 300px at -10% -50%, rgba(59,130,246,0.15), transparent 60%), radial-gradient(900px 300px at 110% -40%, rgba(147,51,234,0.15), transparent 60%), linear-gradient(135deg, rgba(255,255,255,0.95), rgba(249,250,251,0.95))'
              : 'radial-gradient(1200px 300px at -10% -50%, rgba(59,130,246,0.25), transparent 60%), radial-gradient(900px 300px at 110% -40%, rgba(147,51,234,0.25), transparent 60%), linear-gradient(135deg, rgba(30,41,59,0.90), rgba(15,23,42,0.90))',
        }}
      >
        {/* subtle top icicles inside header */}
        <svg className='absolute left-0 right-0 top-0' height='8' width='100%'>
          {Array.from({ length: 36 }).map((_, i) => (
            <polygon
              key={i}
              points={`${i * 9},0 ${i * 9 + 4.5},8 ${i * 9 + 9},0`}
              fill={
                theme === 'light'
                  ? 'rgba(0,0,0,0.05)'
                  : 'rgba(255,255,255,0.10)'
              }
            />
          ))}
        </svg>
        <div className='absolute inset-0 pointer-events-none' aria-hidden>
          <svg width='100%' height='100%'>
            <defs>
              <linearGradient id={`gradX-${theme}`} x1='0' y1='0' x2='1' y2='1'>
                <stop
                  offset='0%'
                  stopColor={
                    theme === 'light'
                      ? 'rgba(59,130,246,0.20)'
                      : 'rgba(59,130,246,0.28)'
                  }
                />
                <stop
                  offset='100%'
                  stopColor={
                    theme === 'light'
                      ? 'rgba(147,51,234,0.20)'
                      : 'rgba(147,51,234,0.28)'
                  }
                />
              </linearGradient>
            </defs>
            {Array.from({ length: 18 }).map((_, i) => (
              <circle
                key={i}
                cx={`${(i * 67) % 360}`}
                cy={`${(i * 39) % 140}`}
                r={`${6 + ((i * 2) % 8)}`}
                fill={`url(#gradX-${theme})`}
                opacity={theme === 'light' ? '0.15' : '0.22'}
              />
            ))}
          </svg>
        </div>
        <div className='relative z-[1] flex items-center gap-2'>
          <div className='relative shrink-0 w-11 h-11'>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt='avatar'
                className={`w-11 h-11 rounded-full object-cover shadow-md border ${
                  theme === 'light' ? 'border-gray-200/60' : 'border-white/20'
                }`}
                referrerPolicy='no-referrer'
                onError={() => setAvatarUrl('')}
              />
            ) : (
              <div className='w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-md' />
            )}
            <img
              src='https://oaewcvliegq6wyvp.public.blob.vercel-storage.com/christmas_hat.png'
              alt='frame'
              className='absolute inset-0 pointer-events-none select-none'
              style={{
                transform: 'translateY(-2px) scale(1.1)',
                transformOrigin: 'center',
              }}
              draggable={false}
            />
          </div>
          <div className='flex-1 pr-16'>
            <div
              className={`text-[12px] font-semibold ${
                theme === 'light' ? 'text-gray-900' : 'text-white'
              }`}
            >
              {isGeneratingReport
                ? t('annualReportTitleGenerating')
                : isReportReady
                ? t('annualReportTitleUnlocked')
                : t('annualReportTitle')}
            </div>
            <div
              className={`text-[10px] mt-0.5 ${
                theme === 'light' ? 'text-gray-600' : 'text-white/80'
              }`}
            >
              {isGeneratingReport
                ? t('annualReportSubtitleGenerating')
                : isReportReady
                ? t('annualReportSubtitleUnlocked')
                : t('annualReportSubtitle')}
            </div>
          </div>
          <div className='absolute right-3 top-1/2 -translate-y-1/2 opacity-80 pointer-events-none'>
            {isInputFocused ||
            inviteInput.trim() ||
            isReportReady ||
            isGeneratingReport ? (
              <div className='w-14 h-14 translate-x-2'>
                <Lottie
                  lottieRef={lottieRef}
                  animationData={christmasCardAnimation}
                  loop={isReportReady ? false : true}
                  autoplay={true}
                  style={{ width: '100%', height: '100%' }}
                  onComplete={() => {
                    if (isReportReady) {
                      playCountRef.current += 1;
                      if (playCountRef.current < 2 && lottieRef.current) {
                        // 如果还没播放完2次，继续播放
                        setTimeout(() => {
                          if (lottieRef.current) {
                            lottieRef.current.goToAndPlay(0);
                          }
                        }, 50);
                      } else if (
                        playCountRef.current >= 2 &&
                        lottieRef.current
                      ) {
                        // 播放完2次后，停在最后一帧（第199帧）
                        lottieRef.current.goToAndStop(150, true);
                      }
                    }
                  }}
                />
              </div>
            ) : (
              <Snowflake
                size={14}
                className={theme === 'light' ? 'text-gray-700' : 'text-white'}
              />
            )}
          </div>
        </div>
        <div className='absolute inset-0 overflow-hidden pointer-events-none'>
          <div className='absolute inset-0'>
            {Array.from({ length: 36 }).map((_, i) => {
              // 圣诞主题颜色：橙色、绿色、红色、金色、蓝色
              const colors = [
                '#F97316', // 橙色
                '#22C55E', // 绿色
                '#EF4444', // 红色
                '#FACC15', // 金色
                '#3B82F6', // 蓝色
              ];
              const baseColor = colors[i % colors.length];
              // 日间模式下增强颜色饱和度和亮度，使其更明显
              const color = theme === 'light' ? baseColor : baseColor;
              return (
                <div
                  key={i}
                  className='rounded-full'
                  style={{
                    position: 'absolute',
                    width: `${Math.max(2, (i % 3) + 2)}px`,
                    height: `${Math.max(2, (i % 3) + 2)}px`,
                    left: `${(i * 37) % 100}%`,
                    top: `${(-i * 20) % 100}%`,
                    backgroundColor: color,
                    boxShadow: `0 0 ${
                      theme === 'light' ? '8' : '10'
                    }px ${color}`,
                    opacity: theme === 'light' ? 0.9 : 0.8,
                    animation: `fall ${5 + (i % 5)}s linear ${
                      i * 0.2
                    }s infinite, twinkle ${2 + (i % 4)}s ease-in-out ${
                      (i % 8) * 0.3
                    }s infinite`,
                  }}
                />
              );
            })}
          </div>
          <style>{`@keyframes fall { 0% { transform: translateY(-10%); opacity: .8;} 100% { transform: translateY(120%); opacity: 0.9;} } @keyframes twinkle { 0%, 100% { opacity: 0.35; filter: blur(0.3px) brightness(0.9) saturate(0.7);} 50% { opacity: 1; filter: blur(0.3px) brightness(1.4) saturate(1.6);} }`}</style>
        </div>
      </div>

      <div
        className={`overflow-hidden transition-all duration-200 linear px-3 theme-bg-secondary z-[1] relative ${
          isInputFocused || isHovered ? 'max-h-[500px] py-2' : 'max-h-0 py-0'
        }`}
      >
        {isGeneratingReport ? (
          <div className='flex flex-col items-center justify-center py-6 gap-3'>
            <div className='relative w-6 h-6'>
              <div className='absolute inset-0 border-[3px] border-blue-500/30 border-t-blue-500 rounded-full animate-spin' />
              <div
                className='absolute inset-2 border-[3px] border-purple-500/30 border-t-purple-500 rounded-full animate-spin'
                style={{
                  animationDirection: 'reverse',
                  animationDuration: '2s',
                }}
              />
            </div>
            <div className='text-center'>
              <div
                className={`text-[12px] font-medium ${
                  theme === 'light' ? 'text-gray-700' : 'text-white/90'
                }`}
              >
                {t('annualReportGenerating')}
              </div>
            </div>
          </div>
        ) : !isReportReady ? (
          <div className='flex flex-col gap-2'>
            <div className='flex flex-row gap-1.5'>
              <input
                value={inviteInput}
                onChange={(e) => {
                  setInviteInput(e.target.value);
                  setErrorMessage('');
                }}
                onFocus={() => {
                  setIsInputFocused(true);
                  // 清除离开的定时器，确保有焦点时内容保持展开
                  if (leaveTimeoutRef.current) {
                    clearTimeout(leaveTimeoutRef.current);
                    leaveTimeoutRef.current = null;
                  }
                  setIsHovered(true);
                }}
                onBlur={() => setIsInputFocused(false)}
                placeholder={
                  isWhitelisted
                    ? t('annualReportWhitelistedPlaceholder')
                    : t('annualReportInvitePlaceholder')
                }
                className={`h-8 px-2.5 text-[12px] rounded-md border theme-border theme-bg-tertiary outline-none focus:border-blue-500 ${
                  isWhitelisted
                    ? 'flex-1 placeholder:text-gray-500 dark:placeholder:text-gray-300'
                    : 'flex-1'
                }`}
                disabled={isGeneratingReport || isWhitelisted}
              />
              <button
                type='button'
                className={`h-8 px-4 rounded-md text-[12px] font-semibold text-white hover:opacity-95 disabled:opacity-60 bg-gradient-to-r from-blue-500 to-purple-500 shadow flex items-center justify-center ${
                  isWhitelisted ? 'flex-1' : 'shrink-0'
                }`}
                disabled={
                  (!isWhitelisted && !inviteInput.trim()) || isGeneratingReport
                }
                onClick={onUnlock}
              >
                {t('annualReportCTA')}
              </button>
            </div>
            {errorMessage && (
              <div
                className={`text-[11px] ${
                  theme === 'light' ? 'text-red-600' : 'text-red-400'
                }`}
              >
                {errorMessage}
              </div>
            )}
            {/* {reportData?.status === false && (
              <div
                className={`text-[11px] ${
                  theme === 'light' ? 'text-red-600' : 'text-red-400'
                }`}
              >
                {reportData.message || t('annualReportNotRegistered')}
              </div>
            )} */}
          </div>
        ) : (
          <div
            className={`relative flex flex-col gap-2.5 transition-all duration-300 ease-out ${
              revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            {/* 微妙的背景装饰 */}
            <div
              className={`absolute inset-0 -mx-3 -my-2 pointer-events-none overflow-hidden rounded-lg ${
                theme === 'light' ? 'opacity-30' : 'opacity-20'
              }`}
            >
              <div
                className='absolute inset-0'
                style={{
                  background:
                    theme === 'light'
                      ? 'radial-gradient(ellipse 200px 100px at 50% 0%, rgba(59,130,246,0.08), transparent 70%), radial-gradient(ellipse 150px 80px at 100% 100%, rgba(147,51,234,0.08), transparent 70%)'
                      : 'radial-gradient(ellipse 200px 100px at 50% 0%, rgba(96,165,250,0.12), transparent 70%), radial-gradient(ellipse 150px 80px at 100% 100%, rgba(168,85,247,0.12), transparent 70%)',
                }}
              />
            </div>
            <div className='relative flex flex-row gap-2'>
              <div className='flex-1 h-8 px-3 text-[11px] rounded-md border theme-border theme-bg-tertiary flex items-center theme-text-primary truncate shadow-sm backdrop-blur-sm transition-all duration-200'>
                <span className='truncate'>
                  {finalReportData?.data?.report_id
                    ? `https://xhunt.ai/2025report/${finalReportData.data.report_id}`
                    : ''}
                </span>
              </div>
              <a
                href={
                  finalReportData?.data?.report_id
                    ? `https://xhunt.ai/2025report/${finalReportData.data.report_id}`
                    : '#'
                }
                target='_blank'
                rel='noopener noreferrer'
                className={`relative shrink-0 h-8 px-3.5 rounded-md text-[11px] font-medium text-white hover:opacity-90 flex items-center justify-center gap-1.5 transition-all duration-200 overflow-hidden group ${
                  theme === 'light'
                    ? 'bg-gradient-to-r from-blue-400/90 via-blue-500/90 to-purple-400/90 shadow-sm'
                    : 'bg-gradient-to-r from-blue-500 via-blue-600 to-purple-500 shadow-md shadow-blue-500/20'
                }`}
              >
                {/* 圣诞/冰雪主题装饰 */}
                <div
                  className={`absolute inset-0 pointer-events-none ${
                    theme === 'light' ? 'opacity-30' : 'opacity-40'
                  }`}
                >
                  <div className='absolute top-0.5 left-1'>
                    <Snowflake
                      size={8}
                      className={
                        theme === 'light' ? 'text-white/60' : 'text-white/70'
                      }
                      strokeWidth={1.5}
                    />
                  </div>
                  <div className='absolute bottom-0.5 right-1'>
                    <Snowflake
                      size={6}
                      className={
                        theme === 'light' ? 'text-white/50' : 'text-white/60'
                      }
                      strokeWidth={1.5}
                    />
                  </div>
                  <div className='absolute top-1/2 -translate-y-1/2 left-1/4'>
                    <div
                      className={`w-1 h-1 rounded-full ${
                        theme === 'light' ? 'bg-white/40' : 'bg-white/50'
                      }`}
                    />
                  </div>
                </div>
                <span className='relative z-[1]'>{t('annualReportOpen')}</span>
                <ExternalLink
                  size={12}
                  className='shrink-0 relative z-[1]'
                  strokeWidth={2.5}
                />
              </a>
            </div>
            <div className='relative flex items-center gap-2'>
              <div className='flex items-center gap-1.5 text-[12px] theme-text-secondary shrink-0 font-medium'>
                <svg
                  className='w-4 h-4 shrink-0'
                  viewBox='0 0 1024 1024'
                  version='1.1'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    d='M134.05382 1023.807856A134.500876 134.500876 0 0 1 0.001281 888.6665V459.096322a135.269452 135.269452 0 0 1 130.722041-135.141356V120.02602A119.641731 119.641731 0 0 1 249.788621 0h525.193896a119.769827 119.769827 0 0 1 119.065299 120.02602v203.928946A135.141356 135.141356 0 0 1 1024.769857 459.096322v429.762322a134.500876 134.500876 0 0 1-134.052539 135.141356H134.05382z m-67.954966-135.141356a68.339254 68.339254 0 0 0 67.954966 68.595446h756.663498a68.339254 68.339254 0 0 0 67.954966-68.595446V515.842882l-64.688516 34.201651v5.187891h-9.79935L509.183167 753.333 66.034806 519.109332z m443.148361-210.397798l318.703028-168.446335V119.961971a53.416062 53.416062 0 0 0-52.967726-53.608206H249.788621a53.352014 53.352014 0 0 0-52.967725 53.608206v393.190894z m-378.523893-199.957969V390.69302a67.378534 67.378534 0 0 0-62.767075 54.568926z m763.324494-3.458594l62.126595-32.792594a67.954966 67.954966 0 0 0-62.126595-51.558669zM348.870933 397.097823a125.662247 125.662247 0 0 1-44.129097-96.072054 123.740806 123.740806 0 0 1 122.203653-124.89367 119.641731 119.641731 0 0 1 85.632224 35.802852A120.02602 120.02602 0 0 1 598.209937 176.132099a123.740806 123.740806 0 0 1 122.203653 124.89367 125.534151 125.534151 0 0 1-34.521891 87.041281L512.577713 551.901926z m77.882412-146.670002a49.89342 49.89342 0 0 0-49.060796 50.469852 51.238429 51.238429 0 0 0 17.997499 39.13335l1.28096 1.088817 115.286465 109.265949 121.691269-115.286465a50.726045 50.726045 0 0 0 12.809607-34.201651 49.829372 49.829372 0 0 0-49.060796-50.469852 48.484363 48.484363 0 0 0-37.852389 18.317738l-47.651739 59.308482-47.779835-59.436578a48.996748 48.996748 0 0 0-37.660245-18.189642z'
                    fill='currentColor'
                  />
                </svg>
                <span>{t('annualReportInvites')}</span>
              </div>
              <div className='flex-1 grid grid-cols-3 gap-2'>
                {finalReportData?.data?.codes?.map((codeItem, idx) => {
                  return (
                    <div key={codeItem.code} className='relative'>
                      <button
                        type='button'
                        onClick={(e) => {
                          // 如果有选中文字，不执行复制
                          const selection = window.getSelection();
                          if (selection && selection.toString().length > 0) {
                            return;
                          }
                          copy(codeItem.code, idx);
                        }}
                        className='w-full h-8 rounded-md border theme-border theme-bg-tertiary hover:theme-bg-tertiary/80 flex items-center justify-center transition-all duration-200 relative group'
                        title={t('annualReportClickToCopy')}
                      >
                        <div className='relative font-mono text-[11px] font-semibold theme-text-secondary tracking-wide select-text'>
                          {codeItem.code}
                        </div>
                      </button>
                      {copiedIndex === idx && (
                        <div className='absolute -top-8 left-1/2 -translate-x-1/2 w-full text-center z-10 animate-in fade-in slide-in-from-bottom-2 duration-200'>
                          <div className='text-[10px] text-green-700 dark:text-green-300 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/40 dark:to-emerald-900/40 px-2.5 py-1 rounded-md border border-green-300 dark:border-green-700 shadow-lg whitespace-nowrap font-medium'>
                            {t('annualReportCopySuccess')}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AnnualReportSection;
