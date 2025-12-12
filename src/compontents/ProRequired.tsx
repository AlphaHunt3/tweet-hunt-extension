import React, { useState } from 'react';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useLockFn } from 'ahooks';
import { ProPanel } from './ProPanel.tsx';
import { Loader2 } from 'lucide-react';
import { StoredUserInfo } from '~types/review.ts';
import { isLegacyUserActive } from '~/utils/legacyUserCheck.ts';

interface ProRequiredProps {
  children: React.ReactNode;
  className?: string;
  showInCenter?: boolean;
  enableAnimation?: boolean;
  showExtraTitle?: boolean;
  showBenefits?: boolean;
}

/**
 * Pro 权限保护组件
 * 如果用户不是 Pro，显示 ProPanel；如果已开通 Pro，正常渲染子组件
 */
export function ProRequired({
  children,
  className = '',
  showInCenter = false,
  enableAnimation = true,
  showExtraTitle = false,
  showBenefits = false,
}: ProRequiredProps) {
  //TODO 暂时版本都通过
  return <>{children}</>;
  // const [token, setToken, { isLoading: isLoadingToken }] = useLocalStorage(
  //   '@xhunt/token',
  //   ''
  // );
  // const [user] = useLocalStorage<StoredUserInfo | null | ''>(
  //   '@xhunt/user',
  //   null
  // );
  // const { t } = useI18n();
  // const [inviteCode, setInviteCode] = useState('');
  // const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  // const [currentUsername] = useLocalStorage('@xhunt/current-username', '');
  //
  // const isLoggedIn = !!token;
  // // 检查 user 是否为有效对象（不是 null 或空字符串）
  // const userObj = user && typeof user === 'object' ? user : null;
  // const isPro = userObj?.isPro ?? false;
  // const proExpiryTime = userObj?.proExpiryTime;
  // // 检查是否为老用户且在有效期内
  // const isLegacyUser = isLegacyUserActive(currentUsername);
  //
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

  // // 如果是老用户且在有效期内，直接返回 children（视为已登录且是 Pro）
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
  // // 如果未登录，显示提示（可选，或者也可以显示登录按钮）
  // if (!isLoggedIn) {
  //   return (
  //     <div
  //       className={`${
  //         showInCenter ? 'flex items-center justify-center' : ''
  //       } ${className}`}
  //       style={showInCenter ? { minHeight: '200px' } : {}}
  //     >
  //       <div className={showInCenter ? 'text-center' : 'p-3 text-center'}>
  //         <div className='text-[12px] theme-text-secondary'>
  //           {t('pleaseLoginFirst')}
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }
  //
  // // 如果不是 Pro，显示 ProPanel
  // if (!isPro) {
  //   return (
  //     <div
  //       className={`${
  //         showInCenter ? 'flex items-center justify-center' : ''
  //       } ${className}`}
  //       style={showInCenter ? { minHeight: '200px' } : {}}
  //     >
  //       <div className={showInCenter ? 'w-full max-w-md' : 'w-full'}>
  //         <ProPanel
  //           isPro={false}
  //           isLegacyPro={userObj?.isLegacyPro}
  //           inviteCode={inviteCode}
  //           setInviteCode={setInviteCode}
  //           isSubmittingInvite={isSubmittingInvite}
  //           onInviteCodeSubmit={handleInviteCodeSubmit}
  //           show={true}
  //           className='border border-gray-200 dark:border-gray-800 rounded-lg'
  //           enableAnimation={enableAnimation}
  //           showExtraTitle={showExtraTitle}
  //           showBenefits={showBenefits}
  //         />
  //       </div>
  //     </div>
  //   );
  // }
  //
  // // 如果是 Pro，正常渲染子组件
  // return <>{children}</>;
}
