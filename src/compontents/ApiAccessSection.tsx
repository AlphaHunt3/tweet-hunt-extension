import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import {
  getApiUserInfo,
  claimApiCredits,
  ApiUserInfo,
  getTwitterAuthUrl,
} from '~contents/services/api';
import { useGlobalTips } from '~compontents/area/GlobalTips.tsx';
import {
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { openNewTab } from '~contents/utils';

/**
 * 根据 Twitter User ID 生成固定的 EVM 地址
 * Rule: 0x66 + hex(user_id), left-pad to 40 hex chars in total.
 */
const generateAddressFromTwitterId = (twitterId: string): string => {
  try {
    // 将 twitterId 转为 BigInt 再转十六进制
    const userHex = BigInt(twitterId).toString(16);
    // 0x66 + 左填充到 38 位的 userHex，总长度 40 位十六进制字符
    const addressHex = '66' + userHex.padStart(38, '0');
    return '0x' + addressHex;
  } catch {
    return '';
  }
};

interface ApiAccessSectionProps {
  onApplySuccess?: () => void;
  onShowRiskDialog?: () => void;
}

export const ApiAccessSection: React.FC<ApiAccessSectionProps> = ({
  onApplySuccess,
  onShowRiskDialog,
}) => {
  const { t } = useI18n();
  const [, setTips] = useGlobalTips();
  const [xhuntUser] = useLocalStorage<
    { id: string; username?: string; evmAddresses?: string[] } | null
  >('@xhunt/user', null);
  const [token] = useLocalStorage('@xhunt/token', '');

  const [apiUserInfo, setApiUserInfo] = useState<ApiUserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // 使用 localStorage 记住是否展示 API Key（申请成功后展示，确认保存后隐藏）
  const [showKey, setShowKey] = useLocalStorage('@xhunt/apiShowKey', false);

  // 根据 Twitter ID 推算的 EVM 地址（固定映射，非用户绑定）
  const derivedEvmAddressFromTwitterId = useMemo(() => {
    if (xhuntUser?.id) {
      return generateAddressFromTwitterId(xhuntUser.id);
    }
    return '';
  }, [xhuntUser?.id]);

  const fetchApiUserInfo = useCallback(async () => {
    if (!derivedEvmAddressFromTwitterId || !token) return;
    setIsLoading(true);
    try {
      const data = await getApiUserInfo(derivedEvmAddressFromTwitterId);
      if (data) {
        setApiUserInfo(data);
      } else {
        setApiUserInfo(null);
      }
    } catch {
      setApiUserInfo(null);
    } finally {
      setIsLoading(false);
    }
  }, [derivedEvmAddressFromTwitterId, token]);

  // 开始申请流程
  const handleStartApply = () => {
    if (!token) {
      try {
        getTwitterAuthUrl().then((ret) => {
          if (ret?.url) openNewTab(ret.url);
        });
      } catch { }
      return;
    }

    // 使用 Twitter ID 推算的地址领取积分
    if (derivedEvmAddressFromTwitterId) {
      handleClaimCredits();
    } else {
      setTips({ text: t('apiAccessLoginRequired'), type: 'fail' });
    }
  };

  // 领取积分
  const handleClaimCredits = async () => {
    if (!derivedEvmAddressFromTwitterId || !xhuntUser?.username) {
      setTips({ text: t('apiAccessLoginRequired'), type: 'fail' });
      return;
    }

    setIsApplying(true);
    try {
      const result = await claimApiCredits({
        address: derivedEvmAddressFromTwitterId,
        username: xhuntUser.username,
      });

      if (result?.success) {
        if (result.alreadyGifted) {
          // 已经领取过，刷新用户信息
          await fetchApiUserInfo();
          setTips({ text: t('apiAccessAlreadyClaimed'), type: 'suc' });
        } else if (result.credited) {
          // 领取成功
          await fetchApiUserInfo();
          setShowKey(true);
          setTips({
            text: `${t('apiAccessApplySuccess')} ${result.credits || ''} credits`,
            type: 'suc'
          });
          setTimeout(() => onApplySuccess?.(), 600);
        } else {
          setTips({ text: t('apiAccessApplyFailed'), type: 'fail' });
        }
      } else {
        setTips({ text: result?.message || t('apiAccessApplyFailed'), type: 'fail' });
      }
    } catch {
      setTips({ text: t('apiAccessApplyFailed'), type: 'fail' });
    } finally {
      setIsApplying(false);
    }
  };

  // 复制到剪贴板
  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2002);
    } catch {
      setTips({ text: t('copyFailed'), type: 'fail' });
    }
  };

  const handleConfirmSaved = () => {
    setShowKey(false);
  };

  const handleOpenDashboard = () =>
    window.open('https://apidashboard.xclaw.info/dashboard', '_blank');
  const handleOpenDocs = () =>
    window.open('https://pro.xclaw.info/', '_blank');

  useEffect(() => {
    fetchApiUserInfo();
  }, [fetchApiUserInfo]);

  // 是否已领取过积分
  const hasClaimedCredits = apiUserInfo?.alreadyGifted || false;
  // 用户是否存在于 Pro API（有账户信息）
  const userExists = apiUserInfo?.exists || false;
  // 是否为老用户（通过绑定地址找到的，queryAddress 和 address 不一致）
  const isLegacyUser = apiUserInfo?.queryAddress && apiUserInfo?.address &&
    apiUserInfo.queryAddress.toLowerCase() !== apiUserInfo.address.toLowerCase();
  // 格式化地址显示（前4后4位）
  const formatAddress = (addr: string) => {
    if (!addr || addr.length < 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className='theme-bg-tertiary/70 ml-1 mr-1 rounded-r-md mb-2 relative'>
      <div className='flex items-center justify-between py-1.5 px-3'>
        <span className='text-[12px] font-semibold theme-text-primary tracking-wide'>
          {t('apiAccessTitle')}
        </span>
      </div>

      <div className='border-t theme-border'>
        {/* ========== 左侧超链接和右侧按钮 ========== */}
        <div className='flex items-center justify-between py-1.5 px-3'>
          <div className='flex items-center gap-3'>
            <button
              onClick={handleOpenDocs}
              className='flex items-center gap-1 text-[11px] theme-text-secondary hover:theme-text-primary transition-colors'
            >
              <span>{t('apiAccessDocs')}</span>
              <ExternalLink className='w-3 h-3' />
            </button>
            {/* 未领取时显示"控制台"超链接，已领取时隐藏（因为右侧会显示按钮） */}
            {!hasClaimedCredits && (
              <button
                onClick={handleOpenDashboard}
                className='flex items-center gap-1 text-[11px] theme-text-secondary hover:theme-text-primary transition-colors'
              >
                <span>{t('apiAccessDashboard')}</span>
                <ExternalLink className='w-3 h-3' />
              </button>
            )}
          </div>

          {/* 未领取时显示"免费获取 credits"，已领取时显示"打开控制台" */}
          {!hasClaimedCredits ? (
            <button
              onClick={handleStartApply}
              disabled={isApplying}
              className='inline-flex items-center px-2.5 py-1 text-[11px] font-medium rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-60'
            >
              {isApplying && (
                <div className='w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1' />
              )}
              {t('apiAccessApplyButton')}
            </button>
          ) : (
            <div className='relative group'>
              <button
                onClick={handleOpenDashboard}
                className='inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors'
              >
                <span>{t('apiAccessOpenDashboard')}</span>
                <ExternalLink className='w-3 h-3' />
              </button>
              <div className='absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-[10px] text-white bg-gray-800 rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-10'>
                {isLegacyUser && apiUserInfo?.queryAddress
                  ? `${t('apiAccessLoginWithAddressPrefix')} ${formatAddress(apiUserInfo.queryAddress)}${t('apiAccessLoginWithAddressSuffix')}`
                  : t('apiAccessDashboardTooltip')}
                <div className='absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800' />
              </div>
            </div>
          )}
        </div>

        {/* ========== 展示 API Key（用户已注册且点击了显示） ========== */}
        {userExists && showKey && apiUserInfo?.apikey && (
          <div className='px-3 py-2 border-t theme-border'>
            <div className='mb-2 text-[10px] theme-text-secondary'>
              {t('apiAccessSaveKeyDesc')}
            </div>

            <div className='flex items-center justify-between gap-3'>
              <div className='flex-1 theme-bg-tertiary border theme-border rounded-md px-2 py-1.5 min-w-0'>
                <code className='text-[10px] font-mono theme-text-primary truncate block'>
                  {apiUserInfo.apikey}
                </code>
              </div>

              <div className='flex items-center gap-1.5 shrink-0'>
                <button
                  onClick={() =>
                    apiUserInfo.apikey && handleCopy(apiUserInfo.apikey, 'apikey')
                  }
                  className='inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors'
                >
                  {copied === 'apikey' ? (
                    <>
                      <Check className='w-3 h-3' />
                      {t('apiAccessCopied')}
                    </>
                  ) : (
                    <>
                      <Copy className='w-3 h-3' />
                      {t('apiAccessCopy')}
                    </>
                  )}
                </button>
                <button
                  onClick={handleConfirmSaved}
                  className='inline-flex items-center px-2 py-1 text-[10px] font-medium rounded-md bg-green-500 text-white hover:bg-green-600 transition-colors'
                >
                  {t('apiAccessConfirmSaved')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========== 用户已注册状态（显示余额和账户） ========== */}
        {userExists && (
          <div className='flex items-center py-1.5 px-3 border-t theme-border'>
            <span className='text-[11px] theme-text-secondary'>
              {t('apiAccessCredits')}:{' '}
              <span className='theme-text-primary'>
                {apiUserInfo?.balance !== null && apiUserInfo?.balance !== undefined
                  ? apiUserInfo.balance.toLocaleString()
                  : '-'}
              </span>
              <span className='ml-3'>
                {"("}{t('apiAccessCurrentAccount')}:{' '}
                <span className='theme-text-secondary'>
                  {isLegacyUser && apiUserInfo?.queryAddress
                    ? formatAddress(apiUserInfo.queryAddress)
                    : `@${xhuntUser?.username || '-'}`}{"）"}
                </span>
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(ApiAccessSection);
