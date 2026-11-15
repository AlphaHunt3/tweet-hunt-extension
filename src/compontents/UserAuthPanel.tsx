import React, { useState } from 'react';
import { Github } from 'lucide-react';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@ui-sdk/react/menu';
import { userLogout } from '~contents/services/review.ts';
import { useLockFn } from 'ahooks';
import { UserInfo, StoredUserInfo } from '~types/review.ts';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { openNewTab } from '~contents/utils';
import { clearAuthState } from '~contents/utils/auth.ts';
import { getTwitterAuthUrl } from '~contents/services/api.ts';
import { useNavigation } from '~/compontents/navigation/PanelNavigator';
import { MoreIcon } from '~/ui/icons';
import { Avatar as UiAvatar, Button, RowButton } from '~/ui/primitives';
import { useUiSkin } from '~/ui/skin/useUiSkin';
// import { ProPanel } from './ProPanel.tsx';

const SOCIAL_LINKS = [
  { label: 'X', href: 'https://x.com/xhunt_ai', icon: <XIcon className='h-3.5 w-3.5 fill-current' /> },
  {
    label: 'GitHub',
    href: 'https://github.com/AlphaHunt3/tweet-hunt-extension',
    icon: <Github className='h-3.5 w-3.5' />,
  },
  { label: 'Telegram', href: 'https://t.me/xhunt_ai', icon: <TelegramIcon className='h-3.5 w-3.5 fill-current' /> },
];

function _UserAuthPanel({
  userInfo,
}: {
  userInfo: UserInfo | undefined | null;
}) {
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [user] = useLocalStorage<StoredUserInfo | null | ''>('@xhunt/user', null);
  const { t } = useI18n();
  const { skin } = useUiSkin();
  const { navigateTo } = useNavigation();

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
    } catch (e) { }
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

  if (!user || typeof user !== 'object' || !user?.username) {
    return (
      <div
        data-xhunt-testid='auth-logged-out-panel'
        className='flex items-center gap-0.5 soft:px-1 obsidian:border-t obsidian:border-xh-line obsidian:px-2.5 obsidian:py-2 native:border-t native:border-xh-line native:px-3 native:py-2.5'
      >
        {SOCIAL_LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target='_blank'
            rel='noopener noreferrer'
            aria-label={link.label}
            title={link.label}
            className='xh-iconbtn'
            data-size='sm'
          >
            {link.icon}
          </a>
        ))}
        <Button
          size='sm'
          variant='primary'
          className='ml-auto'
          onClick={redirectToLogin}
          title={t('loginRequired')}
          data-xhunt-testid='auth-login-button'
        >
          <XIcon className='h-3.5 w-3.5 fill-current' />
          <span className='truncate'>{t('login')}</span>
        </Button>
      </div>
    );
  }

  const name = user.displayName || user.username;

  return (
    <div
      data-xhunt-testid='auth-logged-in-panel'
      className='flex items-center gap-2.5 soft:px-1.5 obsidian:border-t obsidian:border-xh-line obsidian:py-2 obsidian:pl-3 obsidian:pr-2 native:border-t native:border-xh-line native:py-2.5 native:pl-4 native:pr-3'
    >
      <span className='relative flex shrink-0'>
        <UiAvatar name={name} src={user.avatar} size='sm' />
        <span
          aria-hidden='true'
          className='absolute -bottom-px -right-px size-2 rounded-full bg-[#3fbf7f] ring-2 ring-[var(--xh-canvas)]'
        />
      </span>
      {skin === 'native' ? (
        <p className='min-w-0 flex-1 truncate text-[13px] text-xh-fg-2'>
          {t('panelSignedInAs').replace('{handle}', `@${user.username}`)}
        </p>
      ) : (
        <p className='min-w-0 flex-1 leading-tight'>
          <span className='block truncate text-[12px] font-semibold obsidian:font-medium'>{name}</span>
          <span className='block truncate text-[11px] text-xh-fg-2 obsidian:font-xh-mono obsidian:text-[10.5px]'>
            @{user.username}
            {skin === 'soft' ? ` · ${t('panelConnectedX')}` : ''}
          </span>
        </p>
      )}
      {skin === 'native' ? (
        <RowButton
          onClick={() => navigateTo('/settings')}
          className='w-auto shrink-0 rounded-md text-[13px] text-xh-accent-fg hover:bg-transparent hover:underline'
        >
          {t('settings')}
        </RowButton>
      ) : null}
      <Menu
        onAction={(value) => {
          if (value === 'logout') return logout();
        }}
      >
        <MenuTrigger
          className='xh-iconbtn'
          data-size='sm'
          aria-label={t('panelAccountMenu')}
          title={t('panelAccountMenu')}
          data-xhunt-testid='auth-user-menu-button'
        >
          <MoreIcon size={16} />
        </MenuTrigger>
        <MenuContent side='top' align='end' sideOffset={6} className='xh-select-content min-w-[140px]'>
          <MenuItem value='logout' destructive className='xh-select-item' data-xhunt-testid='auth-logout-button'>
            {t('logout')}
          </MenuItem>
        </MenuContent>
      </Menu>
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

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 1024 1024' xmlns='http://www.w3.org/2000/svg' className={className} aria-hidden='true'>
      <path d='M834.24 127.872a95.168 95.168 0 0 0-29.856 7.136h-0.128c-9.12 3.616-52.48 21.856-118.4 49.504l-236.224 99.488c-169.504 71.36-336.128 141.632-336.128 141.632l1.984-0.768s-11.488 3.776-23.488 12a64.96 64.96 0 0 0-18.752 18.144c-5.888 8.64-10.624 21.856-8.864 35.52 2.88 23.104 17.856 36.96 28.608 44.608 10.88 7.744 21.248 11.36 21.248 11.36h0.256l156.256 52.64c7.008 22.496 47.616 156 57.376 186.752 5.76 18.368 11.36 29.856 18.368 38.624 3.392 4.48 7.36 8.224 12.128 11.232a35.808 35.808 0 0 0 7.872 3.392l-1.6-0.384c0.48 0.128 0.864 0.512 1.216 0.64 1.28 0.352 2.144 0.48 3.776 0.736 24.736 7.488 44.608-7.872 44.608-7.872l1.12-0.896 92.256-84 154.624 118.624 3.52 1.504c32.224 14.144 64.864 6.272 82.112-7.616 17.376-13.984 24.128-31.872 24.128-31.872l1.12-2.88 119.488-612.128c3.392-15.104 4.256-29.248 0.512-42.976a57.824 57.824 0 0 0-24.992-33.504 59.904 59.904 0 0 0-34.144-8.64z m-3.232 65.6c-0.128 2.016 0.256 1.792-0.64 5.664v0.352l-118.368 605.76c-0.512 0.864-1.376 2.752-3.744 4.64-2.496 1.984-4.48 3.232-14.88-0.896l-189.12-144.992-114.24 104.128 24-153.28 308.992-288c12.736-11.84 8.48-14.336 8.48-14.336 0.896-14.528-19.232-4.256-19.232-4.256l-389.632 241.376-0.128-0.64-186.752-62.88v-0.128l-0.48-0.096a8.64 8.64 0 0 0 0.96-0.384l1.024-0.512 0.992-0.352s166.752-70.272 336.256-141.632c84.864-35.744 170.368-71.744 236.128-99.52 65.76-27.616 114.368-47.872 117.12-48.96 2.624-1.024 1.376-1.024 3.264-1.024z' />
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
