import React, { useRef } from 'react';
import { ExternalLink, MessageCircle, Check, Info, Wallet } from 'lucide-react';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useInterceptShortcuts } from '~contents/hooks/useInterceptShortcuts.ts';
// import { XLogo } from './XLogo';

interface Task {
  id: string;
  title: string;
  icon: React.ReactNode;
  completed: boolean;
  action: () => void;
}

interface UnregisteredContentProps {
  tasks: Task[];
  evmAddress: string;
  userInviteCode: string;
  isVerifyingWallet: boolean;
  isSubmitting: boolean;
  allRequiredTasksCompleted: boolean;
  isLoggedIn: boolean;
  isRegisteredState: boolean;
  registrationError: string;
  setUserInviteCode: (value: string) => void;
  setEvmAddress: (value: string) => void; // 添加这个函数
  handleWalletVerification?: () => void;
  handleSubmitRegistration: () => void;
  handleGoToActive: () => void;
  redirectToLogin: () => void;
  handleOpenGuide: () => void;
  formatEvmAddress: (addr: string) => string;
  clearRegistrationError: () => void;
}

export function UnregisteredContent({
  tasks,
  evmAddress,
  userInviteCode,
  isVerifyingWallet,
  isSubmitting,
  allRequiredTasksCompleted,
  isLoggedIn,
  isRegisteredState,
  registrationError,
  setUserInviteCode,
  setEvmAddress, // 添加这个参数
  handleWalletVerification,
  handleSubmitRegistration,
  handleGoToActive,
  redirectToLogin,
  handleOpenGuide,
  formatEvmAddress,
  clearRegistrationError,
}: UnregisteredContentProps) {
  const { t } = useI18n();

  // 针对邀请码输入框拦截快捷键（组合键等），避免输入体验被打断
  const inviteInputRef = useRef<HTMLInputElement | null>(null);
  const evmAddressInputRef = useRef<HTMLInputElement | null>(null);
  const currentInputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(
    null
  );
  const isComposingRef = useRef<boolean>(false);
  useInterceptShortcuts(currentInputRef, isComposingRef);

  // 处理 EVM 地址输入变化
  const handleEvmAddressChange = (value: string) => {
    // 移除空格和特殊字符，只保留字母数字和0x前缀
    const cleanedValue = value.replace(/[^a-fA-F0-9x]/g, '');

    // 如果输入的不是以0x开头，自动添加
    let formattedValue = cleanedValue;
    if (cleanedValue && !cleanedValue.startsWith('0x')) {
      formattedValue = '0x' + cleanedValue;
    }

    // 限制长度为42（0x + 40位十六进制）
    if (formattedValue.length <= 42) {
      setEvmAddress(formattedValue);
      clearRegistrationError();
    }
  };

  // EVM地址正则表达式（以0x开头，后跟40个十六进制字符）
  const evmRegex = /^0x[a-fA-F0-9]{40}$/;

  // 验证EVM地址格式
  const isValidEvmAddress = (address: string): boolean => {
    return evmRegex.test(address);
  };

  return (
    <div className='space-y-2.5'>
      {/* 任务列表 - 重新设计 */}
      <div className='space-y-1.5'>
        {/* 前4个任务：2x2网格布局 */}
        <div className='grid grid-cols-2 gap-1.5'>
          {tasks.slice(0, 4).map((task, index) => (
            <div
              key={task.id}
              className={`group relative overflow-hidden rounded-md border transition-all duration-200 ${
                task.completed
                  ? 'bg-gradient-to-br from-green-800/80 to-green-900/80 border-green-600/60'
                  : 'bg-white/[0.02] border-blue-400/15 hover:border-blue-400/30 hover:bg-blue-500/[0.02]'
              }`}
            >
              <button
                onClick={() => {
                  clearRegistrationError(); // 清空错误显示
                  if (!isLoggedIn) {
                    redirectToLogin();
                    return;
                  }
                  task.action();
                }}
                disabled={task.completed}
                className='w-full p-1.5 flex items-center gap-1.5 text-left transition-all duration-200 disabled:cursor-default'
              >
                {/* 状态指示器 */}
                <div
                  className={`relative flex items-center justify-center w-4 h-4 rounded-full transition-all duration-200 ${
                    task.completed
                      ? 'bg-gradient-to-br from-emerald-400 to-green-500 shadow-lg shadow-green-500/30'
                      : 'border border-dashed border-blue-400/40 group-hover:border-blue-400/60 group-hover:bg-blue-400/8'
                  }`}
                >
                  {task.completed ? (
                    <div className='relative'>
                      <Check
                        className='w-2.5 h-2.5 text-white font-bold'
                        strokeWidth={3}
                      />
                      <div className='absolute inset-0 w-2.5 h-2.5 text-white/30 animate-pulse'>
                        <Check className='w-2.5 h-2.5' strokeWidth={3} />
                      </div>
                    </div>
                  ) : (
                    <div className='w-1.5 h-1.5 rounded-full bg-blue-400/50 group-hover:bg-blue-400/70 transition-all duration-200' />
                  )}
                </div>

                {/* 任务内容 */}
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-1'>
                    <div
                      className={`flex items-center justify-center w-3 h-3 rounded transition-all duration-200 ${
                        task.completed
                          ? 'text-green-200'
                          : 'theme-text-secondary group-hover:theme-text-primary'
                      }`}
                    >
                      {task.icon}
                    </div>
                    <span
                      className={`text-[10px] font-medium transition-all duration-200 ${
                        task.completed
                          ? 'text-green-100'
                          : 'theme-text-secondary group-hover:theme-text-primary'
                      }`}
                    >
                      {task.title}
                    </span>
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>

        {/* 第5个任务：独占一行 */}
        {tasks.length > 4 && (
          <div
            className={`group relative overflow-hidden rounded-md border transition-all duration-200 ${
              tasks[4].completed
                ? 'bg-gradient-to-br from-green-800/80 to-green-900/80 border-green-600/60'
                : 'bg-white/[0.02] border-blue-400/15 hover:border-blue-400/30 hover:bg-blue-500/[0.02]'
            }`}
          >
            <button
              onClick={() => {
                clearRegistrationError(); // 清空错误显示
                if (!isLoggedIn) {
                  redirectToLogin();
                  return;
                }
                tasks[4].action();
              }}
              disabled={tasks[4].completed}
              className='w-full p-1.5 flex items-center gap-1.5 text-left transition-all duration-200 disabled:cursor-default'
            >
              {/* 状态指示器 */}
              <div
                className={`relative flex items-center justify-center w-4 h-4 rounded-full transition-all duration-200 ${
                  tasks[4].completed
                    ? 'bg-gradient-to-br from-emerald-400 to-green-500 shadow-lg shadow-green-500/30'
                    : 'border border-dashed border-blue-400/40 group-hover:border-blue-400/60 group-hover:bg-blue-400/8'
                }`}
              >
                {tasks[4].completed ? (
                  <div className='relative'>
                    <Check
                      className='w-2.5 h-2.5 text-white font-bold'
                      strokeWidth={3}
                    />
                    <div className='absolute inset-0 w-2.5 h-2.5 text-white/30 animate-pulse'>
                      <Check className='w-2.5 h-2.5' strokeWidth={3} />
                    </div>
                  </div>
                ) : (
                  <div className='w-1.5 h-1.5 rounded-full bg-blue-400/50 group-hover:bg-blue-400/70 transition-all duration-200' />
                )}
              </div>

              {/* 任务内容 */}
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-1'>
                  <div
                    className={`flex items-center justify-center w-3 h-3 rounded transition-all duration-200 ${
                      tasks[4].completed
                        ? 'text-green-200'
                        : 'theme-text-secondary group-hover:theme-text-primary'
                    }`}
                  >
                    {tasks[4].icon}
                  </div>
                  <span
                    className={`text-[10px] font-medium transition-all duration-200 ${
                      tasks[4].completed
                        ? 'text-green-100'
                        : 'theme-text-secondary group-hover:theme-text-primary'
                    }`}
                  >
                    {tasks[4].title}
                  </span>
                </div>
              </div>
            </button>
          </div>
        )}
      </div>

      <div className='space-y-1'>
        <div className='flex items-center gap-1.5'>
          <div className='relative flex-1'>
            {/* 注释掉原来的只读输入框，改为可编辑的输入框 */}
            {/* <input
              type='text'
              value={formatEvmAddress(evmAddress)}
              placeholder={t('mantleHunterPlaceholderEvmAddress')}
              className={`w-full px-2 py-1.5 pr-8 text-xs rounded-md outline-none cursor-pointer backdrop-blur-sm transition-colors ${'bg-white/5 theme-text-primary border theme-border border-white/10 focus:border-blue-400/40 focus:ring-1 focus:ring-blue-400/20 hover:border-blue-400/30'}`}
              onClick={() => {
                clearRegistrationError(); // 清空错误显示
                if (!isLoggedIn) {
                  redirectToLogin();
                  return;
                }
                handleWalletVerification();
              }}
              title={evmAddress || t('mantleHunterClickToVerifyWallet')}
              readOnly
            /> */}

            {/* 新的可编辑 EVM 地址输入框 */}
            <input
              type='text'
              value={evmAddress}
              onChange={(e) => handleEvmAddressChange(e.target.value)}
              placeholder={t('mantleHunterPlaceholderEvmAddress')}
              ref={evmAddressInputRef}
              className='w-full px-2 py-1.5 pr-8 text-xs rounded-md outline-none backdrop-blur-sm transition-colors bg-white/5 theme-text-primary border theme-border border-white/10 focus:border-blue-400/40 focus:ring-1 focus:ring-blue-400/20 hover:border-blue-400/30'
              onFocus={() => {
                currentInputRef.current = evmAddressInputRef.current;
                clearRegistrationError();
                if (!isLoggedIn) {
                  redirectToLogin();
                }
              }}
              onBlur={() => {
                currentInputRef.current = null;
              }}
              onCompositionStart={() => {
                isComposingRef.current = true;
              }}
              onCompositionEnd={() => {
                isComposingRef.current = false;
              }}
            />

            <div className='absolute right-2 top-1/2 transform -translate-y-1/2 group'>
              <Info className='w-3 h-3 text-blue-400/60 hover:text-blue-400 cursor-help transition-colors' />
              <div className='absolute bottom-full right-0 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg z-10 whitespace-nowrap'>
                {t('mantleHunterInfoEvmAddress')}
                <div className='absolute top-full right-0 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-800'></div>
              </div>
            </div>
          </div>

          {/* 注释掉钱包验证按钮 */}
          {/* <button
            onClick={() => {
              clearRegistrationError(); // 清空错误显示
              handleWalletVerification();
            }}
            disabled={isVerifyingWallet}
            className='inline-flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium rounded-md bg-gradient-to-r from-purple-500/8 to-blue-500/8 border border-purple-400/20 hover:border-purple-400/30 theme-text-primary transition-all duration-200 disabled:opacity-60'
          >
            {isVerifyingWallet ? (
              <>
                <div className='w-2.5 h-2.5 border border-purple-400 border-t-transparent rounded-full animate-spin' />
                <span>{t('connecting')}</span>
              </>
            ) : (
              <>
                <Wallet className='w-3 h-3' />
                <span>{t('mantleHunterTaskVerifyWallet')}</span>
              </>
            )}
          </button> */}

          {/* EVM地址验证提示1 */}
          {evmAddress && evmAddress.length > 0 && (
            <div
              className={`px-2 py-1.5 text-xs rounded-md transition-all duration-200 ${
                isValidEvmAddress(evmAddress)
                  ? 'text-green-400 bg-green-500/10 border border-green-500/20'
                  : 'text-orange-400 bg-orange-500/10 border border-orange-500/20'
              }`}
            >
              <div className='flex items-center gap-1.5'>
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    isValidEvmAddress(evmAddress)
                      ? 'bg-green-400'
                      : 'bg-orange-400'
                  }`}
                />
                <span>
                  {isValidEvmAddress(evmAddress)
                    ? t('mantleHunterEvmAddressFormatCorrect')
                    : t('mantleHunterEvmAddressFormatIncorrect')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 邀请码输入 */}
        <div className='relative'>
          <input
            type='text'
            value={userInviteCode}
            onChange={(e) => {
              const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
              setUserInviteCode(value);
              clearRegistrationError(); // 清空错误显示
            }}
            placeholder={t('mantleHunterPlaceholderInvite')}
            ref={inviteInputRef}
            onFocus={() => {
              currentInputRef.current = inviteInputRef.current;
            }}
            onBlur={() => {
              currentInputRef.current = null;
            }}
            onCompositionStart={() => {
              isComposingRef.current = true;
            }}
            onCompositionEnd={() => {
              isComposingRef.current = false;
            }}
            className='w-full px-2 py-1.5 text-xs rounded-md bg-white/5 theme-text-primary border theme-border border-white/10 outline-none focus:border-blue-400/40 focus:ring-1 focus:ring-blue-400/20 transition-all duration-200 placeholder-gray-400/80 backdrop-blur-sm'
          />
          <div className='absolute right-2 top-1/2 transform -translate-y-1/2 group'>
            <Info className='w-3 h-3 text-blue-400/60 hover:text-blue-400 cursor-help transition-colors' />
            <div className='absolute bottom-full right-0 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg z-10 whitespace-nowrap'>
              {t('mantleHunterInfoInviteCode')}
              <div className='absolute top-full right-0 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-800'></div>
            </div>
          </div>
        </div>

        {/* 错误信息显示 */}
        {registrationError && (
          <div className='px-2 py-1.5 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md animate-in slide-in-from-top-1 duration-200'>
            <div className='flex items-center gap-1.5'>
              <div className='w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse' />
              <span>{registrationError}</span>
            </div>
          </div>
        )}
      </div>

      {/* 报名按钮 */}
      <div className='relative group'>
        <button
          className='w-full relative overflow-hidden px-4 py-3 text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99]'
          onClick={() => {
            clearRegistrationError(); // 清空错误显示
            if (isLoggedIn) {
              if (isRegisteredState) {
                handleGoToActive();
              } else {
                handleSubmitRegistration();
              }
            } else {
              redirectToLogin();
            }
          }}
          disabled={
            isLoggedIn
              ? isRegisteredState
                ? false
                : !allRequiredTasksCompleted ||
                  isSubmitting ||
                  (evmAddress.length > 0 && !isValidEvmAddress(evmAddress))
              : false
          }
          style={{
            opacity: isLoggedIn
              ? isRegisteredState
                ? 1
                : allRequiredTasksCompleted &&
                  !isSubmitting &&
                  (evmAddress.length === 0 || isValidEvmAddress(evmAddress))
                ? 1
                : 0.6
              : 1,
            cursor: isLoggedIn
              ? isRegisteredState
                ? 'pointer'
                : allRequiredTasksCompleted &&
                  !isSubmitting &&
                  (evmAddress.length === 0 || isValidEvmAddress(evmAddress))
                ? 'pointer'
                : 'not-allowed'
              : 'pointer',
          }}
        >
          <span className='leading-none'>
            {isLoggedIn
              ? isRegisteredState
                ? t('mantleHunterStatusGoToOfficial')
                : isSubmitting
                ? t('submitting')
                : t('mantleHunterCta')
              : t('loginToJoin')}
          </span>
          <ExternalLink className='w-3 h-3 ml-1.5' />
        </button>
        {isLoggedIn && !allRequiredTasksCompleted && (
          <div className='absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 shadow-lg'>
            {!evmAddress
              ? t('mantleHunterPleaseVerifyWalletFirst')
              : evmAddress.length > 0 && !isValidEvmAddress(evmAddress)
              ? t('mantleHunterCheckEvmAddressFormat')
              : t('mantleHunterCompleteTasksFirst')}
            <div className='absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-800'></div>
          </div>
        )}
      </div>

      {/* 活动说明链接 */}
      <div className='flex justify-center pb-2'>
        <a
          href={'#'}
          onClick={(e) => {
            e.preventDefault();
            handleOpenGuide();
          }}
          className='inline-flex items-center gap-0.5 text-[10px] theme-text-secondary hover:text-blue-400 transition-colors duration-200 underline underline-offset-2 decoration-dotted'
        >
          {t('mantleHunterViewOfficialGuide')}
          <ExternalLink className='w-2.5 h-2.5' />
        </a>
      </div>
    </div>
  );
}
