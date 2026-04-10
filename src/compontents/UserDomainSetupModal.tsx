import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLocalStorage } from '~storage/useLocalStorage';
import { useI18n } from '~contents/hooks/i18n';
import { Check, ArrowRight, Layers, Bot } from 'lucide-react';
import cssText from 'data-text:~/css/style.css';

export type DomainType = 'web3' | 'ai';

export interface UserDomainPreference {
  domains: DomainType[];
  primaryDomain: DomainType;
}

interface UserDomainSetupModalProps {
  isOpen: boolean;
  onComplete: (preference: UserDomainPreference) => void;
}

const SHADOW_HOST_ID = 'xhunt-domain-setup-host';

const getOrCreateShadowHost = (): { portalHost: HTMLElement } => {
  let shadowHost = document.getElementById(SHADOW_HOST_ID) as HTMLElement | null;
  
  if (!shadowHost) {
    shadowHost = document.createElement('div');
    shadowHost.id = SHADOW_HOST_ID;
    shadowHost.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:99999;';
    
    if (document.body?.parentNode) {
      document.body.parentNode.insertBefore(shadowHost, document.body);
    } else {
      document.documentElement.appendChild(shadowHost);
    }
    
    const shadowRoot = shadowHost.attachShadow({ mode: 'open' });
    
    const style = document.createElement('style');
    style.textContent = cssText;
    shadowRoot.appendChild(style);
    
    const portalHost = document.createElement('div');
    portalHost.style.cssText = 'position:fixed;inset:0;';
    shadowRoot.appendChild(portalHost);
    
    return { portalHost };
  }
  
  return { portalHost: shadowHost.shadowRoot!.querySelector('div') as HTMLElement };
};

// 复选框组件
const Checkbox: React.FC<{ checked: boolean; color: string }> = ({ checked, color }) => (
  <div
    style={{
      width: '20px',
      height: '20px',
      borderRadius: '6px',
      border: checked ? 'none' : '2px solid rgba(255, 255, 255, 0.3)',
      background: checked ? color : 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s',
    }}
  >
    {checked && <Check style={{ width: '14px', height: '14px', color: '#fff' }} strokeWidth={3} />}
  </div>
);

// 领域卡片组件
interface DomainCardProps {
  type: DomainType;
  isSelected: boolean;
  isPrimary: boolean;
  onToggle: () => void;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
}

const DomainCard: React.FC<DomainCardProps> = ({
  type, isSelected, isPrimary, onToggle, title, subtitle, icon, color,
}) => {
  return (
    <div
      onClick={onToggle}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px 12px',
        borderRadius: '16px',
        border: isSelected ? `2px solid ${color}` : '2px solid rgba(75, 85, 99, 0.5)',
        background: isSelected
          ? `linear-gradient(180deg, ${color}26 0%, ${color}0D 100%)`
          : 'linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
        boxShadow: isSelected ? `0 0 20px ${color}40, inset 0 1px 0 rgba(255, 255, 255, 0.1)` : 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        flex: 1,
        minWidth: '120px',
      }}
    >
      {/* 复选框 - 左上角 */}
      <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
        <Checkbox checked={isSelected} color={color} />
      </div>
      
      {/* 图标容器 */}
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '12px',
          marginTop: '8px',
          background: isSelected
            ? `linear-gradient(135deg, ${color}, ${type === 'web3' ? '#6366f1' : '#06b6d4'})`
            : 'rgba(255, 255, 255, 0.1)',
          boxShadow: isSelected ? `0 4px 12px ${color}66` : undefined,
        }}
      >
        <div style={{ color: isSelected ? '#fff' : 'rgba(156, 163, 175, 1)' }}>{icon}</div>
      </div>
      
      {/* 标题 */}
      <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '4px', color: isSelected ? '#fff' : 'rgba(156, 163, 175, 1)' }}>
        {title}
      </div>
      
      {/* 副标题 */}
      <div style={{ fontSize: '12px', color: 'rgba(107, 114, 128, 1)' }}>{subtitle}</div>
    </div>
  );
};

// 主领域切换按钮
const PrimaryToggle: React.FC<{
  domains: DomainType[];
  primaryDomain: DomainType;
  onChange: (domain: DomainType) => void;
}> = ({ domains, primaryDomain, onChange }) => {
  const { t } = useI18n();
  
  if (domains.length < 2) return null;
  
  return (
    <div style={{ marginTop: '16px', padding: '12px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
      <div style={{ fontSize: '11px', color: 'rgba(156, 163, 175, 1)', marginBottom: '10px', textAlign: 'center' }}>
        设置主领域（优先展示）
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        {domains.map((domain) => (
          <button
            key={domain}
            onClick={() => onChange(domain)}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: primaryDomain === domain
                ? domain === 'web3'
                  ? 'linear-gradient(135deg, #3b82f6, #6366f1)'
                  : 'linear-gradient(135deg, #10b981, #06b6d4)'
                : 'rgba(255, 255, 255, 0.1)',
              color: primaryDomain === domain ? '#fff' : 'rgba(156, 163, 175, 1)',
              boxShadow: primaryDomain === domain
                ? domain === 'web3'
                  ? '0 2px 8px rgba(59, 130, 246, 0.4)'
                  : '0 2px 8px rgba(16, 185, 129, 0.4)'
                : undefined,
            }}
          >
            {domain === 'web3' ? (t('domainWeb3') || 'Web3') : (t('domainAi') || 'AI')}
            {primaryDomain === domain && <span style={{ marginLeft: '4px', fontSize: '10px' }}>✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
};

export const UserDomainSetupModal: React.FC<UserDomainSetupModalProps> = ({ isOpen, onComplete }) => {
  const { t } = useI18n();
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const [selectedDomains, setSelectedDomains] = useState<DomainType[]>([]);
  const [primaryDomain, setPrimaryDomain] = useState<DomainType>('web3');
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const { portalHost } = getOrCreateShadowHost();
    setPortalHost(portalHost);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => { setIsVisible(true); setIsAnimating(true); }, 100);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // 切换领域选中状态
  const toggleDomain = useCallback((domain: DomainType) => {
    setSelectedDomains(prev => {
      const isSelected = prev.includes(domain);
      
      if (isSelected) {
        // 至少保留一个
        if (prev.length <= 1) return prev;
        const newSelection = prev.filter(d => d !== domain);
        // 如果取消的是主领域，把剩下的设为主领域
        if (primaryDomain === domain) {
          setPrimaryDomain(newSelection[0]);
        }
        return newSelection;
      } else {
        // 添加新领域
        const newSelection = [...prev, domain];
        // 如果这是第一个选中的，设为主领域
        if (newSelection.length === 1) {
          setPrimaryDomain(domain);
        }
        return newSelection;
      }
    });
  }, [primaryDomain]);

  const handleConfirm = useCallback(() => {
    if (selectedDomains.length === 0) return;
    onComplete({ domains: selectedDomains, primaryDomain });
  }, [selectedDomains, primaryDomain, onComplete]);

  useEffect(() => {
    if (isOpen && selectedDomains.length === 0) {
      setSelectedDomains(['web3']);
      setPrimaryDomain('web3');
    }
  }, [isOpen]);

  if (!isVisible || !portalHost) return null;

  const isConfirmDisabled = selectedDomains.length === 0;
  
  const getHintText = () => {
    if (selectedDomains.length === 0) return '请至少选择一个领域';
    if (selectedDomains.length === 1) {
      const domain = selectedDomains[0];
      return `已选择: ${domain === 'web3' ? 'Web3' : 'AI'}（默认为主领域）`;
    }
    return `已选择 ${selectedDomains.length} 个领域，可在下方设置主领域`;
  };

  return createPortal(
    <div data-theme={theme} style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isAnimating ? 1 : 0, transition: 'opacity 0.3s ease' }}>
      {/* 背景遮罩 */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(10px)' }} />
      
      {/* 弹框卡片 */}
      <div style={{ 
        position: 'relative', 
        width: '340px', 
        margin: '0 16px', 
        borderRadius: '24px', 
        border: '1px solid rgba(255, 255, 255, 0.1)', 
        overflow: 'hidden', 
        transform: isAnimating ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(16px)', 
        opacity: isAnimating ? 1 : 0, 
        transition: 'all 0.3s ease', 
        background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)', 
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)' 
      }}>
        {/* 顶部渐变条 */}
        <div style={{ height: '3px', width: '100%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #10b981)' }} />
        
        <div style={{ padding: '24px' }}>
          {/* XHunt Logo - 水平居中 */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <img 
              src='https://oaewcvliegq6wyvp.public.blob.vercel-storage.com/xhunt_new.jpg' 
              alt='XHunt' 
              style={{ width: '48px', height: '48px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)' }} 
            />
          </div>
          
          {/* 标题区域 */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 'bold', color: '#fff', marginBottom: '6px' }}>
              {t('userDomainSetupTitle') || '选择您感兴趣的领域'}
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(156, 163, 175, 1)' }}>
              {t('userDomainSetupSubtitle') || '根据您的选择为您定制内容'}
            </p>
          </div>
          
          {/* 领域选择卡片 */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <DomainCard 
              type='web3' 
              isSelected={selectedDomains.includes('web3')} 
              isPrimary={primaryDomain === 'web3'} 
              onToggle={() => toggleDomain('web3')} 
              title={t('domainWeb3') || 'Web3'} 
              subtitle={t('domainWeb3Desc') || '区块链'} 
              icon={<Layers style={{ width: '24px', height: '24px' }} />}
              color='#3b82f6'
            />
            <DomainCard 
              type='ai' 
              isSelected={selectedDomains.includes('ai')} 
              isPrimary={primaryDomain === 'ai'} 
              onToggle={() => toggleDomain('ai')} 
              title={t('domainAi') || 'AI'} 
              subtitle={t('domainAiDesc') || '人工智能'} 
              icon={<Bot style={{ width: '24px', height: '24px' }} />}
              color='#10b981'
            />
          </div>
          
          {/* 主领域切换（仅在选中两个时显示） */}
          <PrimaryToggle 
            domains={selectedDomains} 
            primaryDomain={primaryDomain} 
            onChange={setPrimaryDomain} 
          />
          
          {/* 提示文字 */}
          <div style={{ textAlign: 'center', marginTop: '12px', marginBottom: '4px' }}>
            <p style={{ fontSize: '12px', color: 'rgba(107, 114, 128, 1)' }}>{getHintText()}</p>
          </div>
          
          {/* 确认按钮 */}
          <button 
            onClick={handleConfirm} 
            disabled={isConfirmDisabled} 
            style={{ 
              width: '100%', 
              marginTop: '16px', 
              padding: '12px 16px', 
              borderRadius: '12px', 
              fontSize: '14px', 
              fontWeight: 600, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '6px', 
              transition: 'all 0.2s', 
              background: isConfirmDisabled ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(90deg, #3b82f6, #6366f1)', 
              color: isConfirmDisabled ? 'rgba(255, 255, 255, 0.3)' : '#fff', 
              boxShadow: isConfirmDisabled ? undefined : '0 4px 15px rgba(59, 130, 246, 0.4)', 
              cursor: isConfirmDisabled ? 'not-allowed' : 'pointer', 
              opacity: isConfirmDisabled ? 0.5 : 1, 
              border: 'none' 
            }}
          >
            {t('domainConfirmButton') || '确认并开始使用'}
            <ArrowRight style={{ width: '16px', height: '16px' }} />
          </button>
        </div>
      </div>
    </div>,
    portalHost
  );
};

export default UserDomainSetupModal;
