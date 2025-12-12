import React, { useState } from 'react';
import { Info, LogOut, MoreVertical } from 'lucide-react';
import { userLogout } from '~contents/services/review.ts';
import { useLockFn } from 'ahooks';
import { UserInfo, StoredUserInfo } from '~types/review.ts';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { openNewTab } from '~contents/utils';
import { clearAuthState } from '~contents/utils/auth.ts';
import { Github } from 'lucide-react';
import { getTwitterAuthUrl } from '~contents/services/api.ts';
// import { ProPanel } from './ProPanel.tsx';

function _UserAuthPanel({
  userInfo,
}: {
  userInfo: UserInfo | undefined | null;
}) {
  const [showLogout, setShowLogout] = useState(false);
  const [showProPanel, setShowProPanel] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [, setToken] = useLocalStorage('@xhunt/token', '');
  // const [showPointsInfo, setShowPointsInfo] = useState(false);
  const [user, setUser] = useLocalStorage<StoredUserInfo | null | ''>(
    '@xhunt/user',
    null
  );
  const { t } = useI18n();

  // const isPro = userInfo?.isPro ?? false;
  // const proExpiryTime = userInfo?.proExpiryTime;
  const logout = useLockFn(async () => {
    await userLogout();
    await clearAuthState();
    // 刷新当前页面
    setTimeout(() => {
      window.location.reload();
    }, 300);
  });

  const redirectToLogin = useLockFn(async () => {
    try {
      const ret = await getTwitterAuthUrl();
      if (ret?.url) {
        openNewTab(ret.url);
      }
    } catch (e) {}
  });

  // const handleInviteCodeSubmit = useLockFn(async () => {
  //   if (!inviteCode.trim()) return;
  //   setIsSubmittingInvite(true);
  //   try {
  //     // TODO: 调用邀请码开通API
  //     // await activateProWithInviteCode(inviteCode);
  //     console.log('Submitting invite code:', inviteCode);
  //     // 成功后刷新用户信息
  //     setTimeout(() => {
  //       setIsSubmittingInvite(false);
  //       setInviteCode('');
  //       window.location.reload();
  //     }, 1000);
  //   } catch (e) {
  //     setIsSubmittingInvite(false);
  //   }
  // });

  // 未登录视图：底部显示图标 + 登录按钮
  if (!user || typeof user !== 'object' || !user?.username) {
    return (
      <div className='sticky bottom-0 z-10 px-2 py-2 border-t theme-border theme-bg-secondary/95'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-1'>
            <a
              href='https://x.com/xhunt_ai'
              target='_blank'
              rel='noopener noreferrer'
              title='@xhunt_ai'
              className='inline-flex items-center px-1.5 py-1 rounded-md hover:theme-bg-tertiary transition-colors'
            >
              <XIcon className='w-4 h-4 fill-current theme-text-primary' />
            </a>
            <a
              href='https://github.com/AlphaHunt3/tweet-hunt-extension'
              target='_blank'
              rel='noopener noreferrer'
              title='GitHub'
              className='inline-flex items-center px-1.5 py-1 rounded-md hover:theme-bg-tertiary transition-colors'
            >
              <Github className='w-4 h-4 theme-text-primary' />
            </a>
            <a
              href='https://t.me/xhunt_ai'
              target='_blank'
              rel='noopener noreferrer'
              title='Telegram'
              className='inline-flex items-center px-1.5 py-1 rounded-md hover:theme-bg-tertiary transition-colors'
            >
              <svg
                viewBox='0 0 1024 1024'
                xmlns='http://www.w3.org/2000/svg'
                className='w-4 h-4 fill-current theme-text-primary'
              >
                <path d='M834.24 127.872a95.168 95.168 0 0 0-29.856 7.136h-0.128c-9.12 3.616-52.48 21.856-118.4 49.504l-236.224 99.488c-169.504 71.36-336.128 141.632-336.128 141.632l1.984-0.768s-11.488 3.776-23.488 12a64.96 64.96 0 0 0-18.752 18.144c-5.888 8.64-10.624 21.856-8.864 35.52 2.88 23.104 17.856 36.96 28.608 44.608 10.88 7.744 21.248 11.36 21.248 11.36h0.256l156.256 52.64c7.008 22.496 47.616 156 57.376 186.752 5.76 18.368 11.36 29.856 18.368 38.624 3.392 4.48 7.36 8.224 12.128 11.232a35.808 35.808 0 0 0 7.872 3.392l-1.6-0.384c0.48 0.128 0.864 0.512 1.216 0.64 1.28 0.352 2.144 0.48 3.776 0.736 24.736 7.488 44.608-7.872 44.608-7.872l1.12-0.896 92.256-84 154.624 118.624 3.52 1.504c32.224 14.144 64.864 6.272 82.112-7.616 17.376-13.984 24.128-31.872 24.128-31.872l1.12-2.88 119.488-612.128c3.392-15.104 4.256-29.248 0.512-42.976a57.824 57.824 0 0 0-24.992-33.504 59.904 59.904 0 0 0-34.144-8.64z m-3.232 65.6c-0.128 2.016 0.256 1.792-0.64 5.664v0.352l-118.368 605.76c-0.512 0.864-1.376 2.752-3.744 4.64-2.496 1.984-4.48 3.232-14.88-0.896l-189.12-144.992-114.24 104.128 24-153.28 308.992-288c12.736-11.84 8.48-14.336 8.48-14.336 0.896-14.528-19.232-4.256-19.232-4.256l-389.632 241.376-0.128-0.64-186.752-62.88v-0.128l-0.48-0.096a8.64 8.64 0 0 0 0.96-0.384l1.024-0.512 0.992-0.352s166.752-70.272 336.256-141.632c84.864-35.744 170.368-71.744 236.128-99.52 65.76-27.616 114.368-47.872 117.12-48.96 2.624-1.024 1.376-1.024 3.264-1.024z' />
              </svg>
            </a>
          </div>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={redirectToLogin}
              className='inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-md border theme-border theme-text-secondary hover:theme-text-primary hover:theme-bg-tertiary transition-colors'
              title={t('loginRequired')}
            >
              <XIcon className='w-3.5 h-3.5 fill-current' />
              <span className='truncate'>{t('login')}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className='sticky bottom-0 theme-bg-secondary backdrop-blur-sm theme-border border-t'
      onMouseEnter={() => {
        if (!showLogout) {
          setShowProPanel(true);
          setShowLogout(false);
        }
      }}
      onMouseLeave={() => {
        setShowProPanel(false);
      }}
    >
      {/* Pro 金色装饰 */}
      {/* {isPro && ( */}
      {/* <div className='absolute inset-0 pointer-events-none overflow-hidden rounded-t-lg'> */}
      {/* 顶部左侧金色光晕 */}
      {/* <div className='absolute top-0 left-0 w-16 h-16 bg-gradient-to-br from-amber-500/20 via-yellow-400/15 to-transparent dark:from-amber-500/15 dark:via-yellow-400/10 blur-sm' /> */}
      {/* 顶部右侧金色线条 */}
      {/* <div className='absolute top-0 right-0 w-20 h-px bg-gradient-to-l from-amber-500/60 via-yellow-400/40 to-transparent dark:from-amber-400/50 dark:via-yellow-300/30' /> */}
      {/* 左侧底部金色装饰点 */}
      {/* <div className='absolute bottom-2 left-2 w-1 h-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 dark:from-amber-400 dark:to-yellow-300 shadow-sm shadow-amber-500/50' /> */}
      {/* </div> */}
      {/* )} */}
      <div className='p-2 flex items-center justify-between relative z-10'>
        <div className='flex items-center gap-2'>
          <div className='relative'>
            <XIcon className='w-3.5 h-3.5 text-[#1d9bf0]' />
            <div className='absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-400 rounded-full theme-border' />
          </div>
          <Avatar src={user.avatar} alt={user.displayName} size={24} />
          <div className='flex flex-col'>
            <div className='flex items-center gap-1.5'>
              <span className='text-xs font-medium leading-tight theme-text-primary'>
                {user.displayName}
              </span>
              {/* {isPro && (
                <span
                  onClick={() => {
                    setShowProPanel(true);
                    setShowLogout(false);
                  }}
                  className='cursor-pointer -translate-y-0.5 inline-flex items-center px-0.5 py-0.5 rounded text-[8px] font-bold leading-none bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 dark:from-amber-600 dark:via-yellow-500 dark:to-amber-600 text-amber-900 dark:text-amber-100 border border-amber-300/60 dark:border-amber-500/40'
                >
                  {t('proBadge')}
                </span>
              )} */}
            </div>
            <span className='text-[10px] theme-text-secondary leading-tight'>
              @{user.username}
            </span>
          </div>
        </div>
        <button
          onClick={() => {
            setShowLogout(!showLogout);
            if (!showLogout) {
              setShowProPanel(false);
            }
          }}
          className='p-1.5 theme-hover rounded-full transition-colors'
        >
          <MoreVertical className='w-3.5 h-3.5 theme-text-secondary' />
        </button>

        {showLogout && (
          <>
            <div className='absolute bottom-full right-0 mb-1 w-32 theme-bg-secondary rounded-lg shadow-lg theme-border overflow-hidden z-20'>
              <button
                onClick={() => {
                  setShowLogout(false);
                  logout().then((r) => r);
                }}
                className='w-full px-3 py-2 flex items-center gap-2 text-xs text-red-400 theme-hover transition-colors'
              >
                <LogOut className='w-3.5 h-3.5' />
                {t('logout')}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Pro Panel */}
      {/* {showProPanel && (
        <div className='absolute bottom-full left-0 right-0 z-[9999]'>
          <ProPanel
            isPro={isPro}
            proExpiryTime={proExpiryTime}
            isLegacyPro={userInfo?.isLegacyPro}
            inviteCode={inviteCode}
            setInviteCode={setInviteCode}
            isSubmittingInvite={isSubmittingInvite}
            onInviteCodeSubmit={handleInviteCodeSubmit}
            show={showProPanel}
            showBenefits={true}
          />
        </div>
      )} */}
    </div>
  );
}
export const UserAuthPanel = React.memo(_UserAuthPanel);

function XIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox='0 0 24 24' className={className} fill='currentColor'>
      <path d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' />
    </svg>
  );
}

interface AvatarProps {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}

function _Avatar({ src, alt, size = 32, className = '' }: AvatarProps) {
  const [error, setError] = React.useState(false);
  const initials = (alt || '')
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
  ];

  const colorIndex =
    (alt || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    colors.length;
  const bgColor = colors[colorIndex];

  if (error || !src) {
    return (
      <div
        className={`flex items-center justify-center rounded-full ${bgColor} ${className}`}
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <span
          className='text-white font-medium'
          style={{ fontSize: `${size * 0.4}px` }}
        >
          {initials || '?'}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`rounded-full ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
      onError={() => setError(true)}
    />
  );
}

export const Avatar = React.memo(_Avatar);
