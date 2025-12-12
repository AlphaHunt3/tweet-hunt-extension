import React from 'react';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { getTwitterAuthUrl } from '~contents/services/api.ts';
import { openNewTab } from '~contents/utils';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useLockFn } from 'ahooks';
import { Loader2 } from 'lucide-react';
import { isLegacyUserActive } from '~/utils/legacyUserCheck.ts';

function XIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox='0 0 24 24' className={className} fill='currentColor'>
      <path d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' />
    </svg>
  );
}

interface LoginRequiredProps {
  children: React.ReactNode;
  className?: string;
  showInCenter?: boolean;
}

/**
 * 登录保护组件
 * 如果用户未登录，显示登录按钮；如果已登录，正常渲染子组件
 */
export function LoginRequired({
  children,
  className = '',
  showInCenter = false,
}: LoginRequiredProps) {
  //TODO 暂时版本都通过
  return <>{children}</>;
  // const [token, , { isLoading: isLoadingToken }] = useLocalStorage(
  //   '@xhunt/token',
  //   ''
  // );
  // const { t } = useI18n();
  // const [currentUsername] = useLocalStorage('@xhunt/current-username', '');
  //
  // const redirectToLogin = useLockFn(async () => {
  //   try {
  //     const ret = await getTwitterAuthUrl();
  //     if (ret?.url) {
  //       openNewTab(ret.url);
  //     }
  //   } catch (e) {}
  // });
  //
  // const isLoggedIn = !!token;
  // // 检查是否为老用户且在有效期内
  // const isLegacyUser = isLegacyUserActive(currentUsername);
  //
  // // 如果是老用户且在有效期内，直接返回 children（视为已登录）
  // if (isLegacyUser) {
  //   return <>{children}</>;
  // }
  //
  // // 如果正在加载 token，显示加载状态
  // if (isLoadingToken) {
  //   return (
  //     <div
  //       className={`${
  //         showInCenter ? 'flex items-center justify-center' : ''
  //       } ${className}`}
  //       style={showInCenter ? { minHeight: '200px' } : {}}
  //     >
  //       <div className='flex flex-col items-center justify-center h-16'>
  //         <Loader2 className='w-5 h-5 text-blue-400 animate-spin mb-2' />
  //         <p className='text-xs theme-text-secondary'>{t('loading')}</p>
  //       </div>
  //     </div>
  //   );
  // }
  //
  // if (!isLoggedIn) {
  //   return (
  //     <div
  //       className={`${
  //         showInCenter ? 'flex items-center justify-center' : ''
  //       } ${className}`}
  //       style={showInCenter ? { minHeight: '200px' } : {}}
  //     >
  //       <div className={showInCenter ? 'text-center' : 'p-3 text-center'}>
  //         <button
  //           type='button'
  //           onClick={redirectToLogin}
  //           className='inline-flex items-center gap-1.5 px-3 py-2 text-[11px] rounded-md border theme-border theme-text-secondary hover:theme-text-primary hover:theme-bg-tertiary transition-colors'
  //         >
  //           <XIcon className='w-3.5 h-3.5' />
  //           <span className='truncate'>{t('pleaseLoginToViewDetails')}</span>
  //         </button>
  //       </div>
  //     </div>
  //   );
  // }
  //
  // return <>{children}</>;
}
