import React, { useState } from 'react';
import { Info, LogOut, MoreVertical } from 'lucide-react';
import { userLogout } from '~contents/services/review.ts';
import { useLockFn } from 'ahooks';
import { UserInfo } from '~types/review.ts';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useLocalStorage } from '~storage/useLocalStorage.ts';

function _UserAuthPanel({ userInfo }: {
  userInfo: UserInfo | undefined | null
}) {
  const [showLogout, setShowLogout] = useState(false);
  const [, setToken] = useLocalStorage('@xhunt/token', '');
  const [showPointsInfo, setShowPointsInfo] = useState(false);
  const [user, setUser] = useLocalStorage<{
    avatar: string;
    displayName: string;
    username: string;
    id: string;
  } | null | ''>('@xhunt/user', null);
  const { t } = useI18n();
  const logout = useLockFn(async () => {
    await userLogout();
    await setToken('');
    await setUser('');
  });

  if (!user || typeof user !== 'object' || !user?.username) {
    return null;
  }

  return (
    <div className="sticky bottom-0 theme-bg-secondary backdrop-blur-sm theme-border border-t">
      <div className="p-2 flex items-center justify-between relative">
        <div className="flex items-center gap-2">
          <div className="relative">
            <XIcon className="w-3.5 h-3.5 text-[#1d9bf0]" />
            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-400 rounded-full theme-border" />
          </div>
          <Avatar
            src={user.avatar}
            alt={user.displayName}
            size={24}
          />
          <div className="flex flex-col">
            <span className="text-xs font-medium leading-tight theme-text-primary">{user.displayName}</span>
            <span className="text-[10px] theme-text-secondary leading-tight">
              @{user.username}
              {userInfo && userInfo?.username === userInfo.username &&
                <div className="inline-flex items-center gap-1 rounded px-1.5 py-0.5">
                  <span className="text-[10px] font-medium text-blue-400">{userInfo?.xPoints || 0} {t('xPoints')}</span>
                  <button
                    className="relative"
                    onMouseEnter={() => setShowPointsInfo(true)}
                    onMouseLeave={() => setShowPointsInfo(false)}
                  >
                    <Info className="w-3 h-3 text-gray-500" />
                    {showPointsInfo && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 theme-bg-secondary rounded-lg shadow-lg text-[10px] leading-relaxed">
                        <div className="font-medium mb-1 theme-text-primary">{t('xPointsRules')}</div>
                        <div className="space-y-0.5 theme-text-secondary">
                          <div>{t('xPointsRank1')}</div>
                          <div>{t('xPointsRank2')}</div>
                          <div>{t('xPointsRank3')}</div>
                          <div>{t('xPointsRank4')}</div>
                          <div>{t('xPointsRank5')}</div>
                          <div>{t('xPointsRank6')}</div>
                        </div>
                      </div>
                    )}
                  </button>
                </div>}
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowLogout(!showLogout)}
          className="p-1.5 theme-hover rounded-full transition-colors"
        >
          <MoreVertical className="w-3.5 h-3.5 theme-text-secondary" />
        </button>

        {showLogout && (
          <>
            <div className="absolute bottom-full right-0 mb-1 w-32 theme-bg-secondary rounded-lg shadow-lg theme-border overflow-hidden">
              <button
                onClick={() => {
                  setShowLogout(false);
                  logout().then(r => r);
                }}
                className="w-full px-3 py-2 flex items-center gap-2 text-xs text-red-400 theme-hover transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                {t('logout')}
              </button>
            </div>
            {/*<button*/}
            {/*  className="fixed inset-0 z-10"*/}
            {/*  onClick={() => setShowLogout(false)}*/}
            {/*/>*/}
          </>
        )}
      </div>
    </div>
  );
}
export const UserAuthPanel = React.memo(_UserAuthPanel);

function XIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
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
  .map(word => word[0])
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

  const colorIndex = (alt || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  const bgColor = colors[colorIndex];

  if (error || !src) {
    return (
      <div
        className={`flex items-center justify-center rounded-full ${bgColor} ${className}`}
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <span
          className="text-white font-medium"
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
