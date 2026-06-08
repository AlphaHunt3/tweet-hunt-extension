import { useCallback, useEffect } from 'react';
import { useLocalStorage } from '~storage/useLocalStorage';

export type DomainType = 'web3' | 'ai';

export interface UserDomainPreference {
  domains: DomainType[];
  primaryDomain: DomainType;
}

// 默认值
const DEFAULT_PREFERENCE: UserDomainPreference = {
  domains: ['web3'],
  primaryDomain: 'web3',
};

// 存储 key
const USER_DOMAIN_KEY = '@xhunt/user-domain-preference';
const USER_DOMAIN_SETUP_COMPLETED = '@xhunt/user-domain-setup-completed';

/**
 * 用户领域偏好管理 Hook
 * 用于管理用户选择的 Web3/AI 领域偏好
 */
export function useUserDomain() {
  const [preference, setPreference] = useLocalStorage<UserDomainPreference>(
    USER_DOMAIN_KEY,
    DEFAULT_PREFERENCE
  );

  const [isSetupCompleted, setIsSetupCompleted, { isLoading: isSetupLoading }] = useLocalStorage<boolean>(
    USER_DOMAIN_SETUP_COMPLETED,
    false
  );

  const USER_DOMAIN_SETUP_VISIBLE = '@xhunt/domain-setup-visible';

  // 是否需要显示设置弹框（用 localStorage 同步，供多组件共享）
  const [shouldShowSetup, setShouldShowSetup] = useLocalStorage<boolean>(
    USER_DOMAIN_SETUP_VISIBLE,
    false
  );

  // 防御性兜底：如果 setup 已完成但弹窗标记仍为 true，立即关闭
  useEffect(() => {
    if (!isSetupLoading && isSetupCompleted && shouldShowSetup) {
      setShouldShowSetup(false);
    }
  }, [isSetupLoading, isSetupCompleted, shouldShowSetup, setShouldShowSetup]);

  // 检查是否需要显示设置弹框
  useEffect(() => {
    // 延迟检查，等待其他初始化完成
    const timer = setTimeout(() => {
      if (!isSetupCompleted) {
        setShouldShowSetup(true);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [isSetupCompleted, setShouldShowSetup]);

  // 添加领域
  const addDomain = useCallback((domain: DomainType) => {
    setPreference(prev => {
      const current = prev || DEFAULT_PREFERENCE;
      if (current.domains.includes(domain)) return current;
      return {
        ...current,
        domains: [...current.domains, domain],
      };
    });
  }, [setPreference]);

  // 移除领域
  const removeDomain = useCallback((domain: DomainType) => {
    setPreference(prev => {
      const current = prev || DEFAULT_PREFERENCE;
      if (current.domains.length <= 1) return current; // 至少保留一个
      const newDomains = current.domains.filter(d => d !== domain);
      return {
        domains: newDomains,
        primaryDomain: newDomains[0],
      };
    });
  }, [setPreference]);

  // 设置主领域
  const setPrimaryDomain = useCallback((domain: DomainType) => {
    setPreference(prev => {
      const current = prev || DEFAULT_PREFERENCE;
      return {
        ...current,
        primaryDomain: domain,
      };
    });
  }, [setPreference]);

  // 完成设置
  const completeSetup = useCallback((newPreference: UserDomainPreference) => {
    setPreference(newPreference);
    setIsSetupCompleted(true);
    setShouldShowSetup(false);
  }, [setPreference, setIsSetupCompleted, setShouldShowSetup]);

  // 重置设置（用于调试或重新设置）
  const resetSetup = useCallback(() => {
    setIsSetupCompleted(false);
    setShouldShowSetup(true);
  }, [setIsSetupCompleted]);

  // 获取当前偏好（确保不会是 undefined）
  const currentPreference = preference || DEFAULT_PREFERENCE;

  // 检查是否选择了某个领域
  const hasDomain = useCallback((domain: DomainType) => {
    return currentPreference.domains.includes(domain);
  }, [currentPreference.domains]);

  // 是否是 Web3 优先
  const isWeb3Primary = currentPreference.primaryDomain === 'web3';

  // 是否是 AI 优先
  const isAiPrimary = currentPreference.primaryDomain === 'ai';

  return {
    // 状态
    domains: currentPreference.domains,
    primaryDomain: currentPreference.primaryDomain,
    isSetupCompleted,
    isSetupLoading,
    shouldShowSetup,

    // 计算属性
    isWeb3Primary,
    isAiPrimary,
    hasWeb3: hasDomain('web3'),
    hasAi: hasDomain('ai'),
    hasBoth: currentPreference.domains.length === 2,

    // 方法
    addDomain,
    removeDomain,
    setPrimaryDomain,
    completeSetup,
    resetSetup,
    setShouldShowSetup,
  };
}

export default useUserDomain;
