import React, { useState, useEffect } from 'react';
import { useLocalStorage } from '~storage/useLocalStorage';
import { useI18n } from '~contents/hooks/i18n';

export const PrivacyConsent: React.FC = () => {
  const { t } = useI18n();
  const [hasAgreed, setHasAgreed] = useLocalStorage('@xhunt/privacy-consent', false);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // 延迟显示动画
  useEffect(() => {
    if (!hasAgreed) {
      const timer = setTimeout(() => {
        setIsVisible(true);
        setIsAnimating(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasAgreed]);

  const handleAgree = () => {
    setHasAgreed(true);
    setIsAnimating(false);
    // 等待动画完成后隐藏组件
    setTimeout(() => setIsVisible(false), 300);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-[99999] theme-border border-t backdrop-blur-md transition-all duration-300 ease-out hover:opacity-100 ${isAnimating ? 'translate-y-0' : 'translate-y-full'
        }`}
      style={{
        backgroundColor: 'var(--xhunt-web-bg)',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
        opacity: 0.9,
      }}
    >
      {/* 半透明遮罩层 */}
      <div
        className='absolute inset-0 pointer-events-none'
        style={{
          // backgroundColor: 'rgba(0, 0, 0, 0.25)',
          backdropFilter: 'blur(10px)',
        }}
      />
      <div className='relative z-10 max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3'>
        {/* 左侧：图标 + 文字 */}
        <div className='flex items-center gap-3 flex-1'>
          {/* XHunt Logo */}
          <img
            className='flex-shrink-0 w-8 h-8 rounded-full object-cover'
            src='https://oaewcvliegq6wyvp.public.blob.vercel-storage.com/xhunt_new.jpg'
            alt='XHunt'
          />

          {/* 文字内容 */}
          <p className='text-sm theme-text-primary leading-relaxed'>
            {t('privacyConsent.updateNotice')}
            <a
              href='https://xhunt.ai/tos_privacy'
              target='_blank'
              rel='noopener noreferrer'
              className='theme-text-secondary hover:theme-text-primary hover:underline transition-colors font-medium'
            >
              {t('privacyConsent.policyLink')}
            </a>
          </p>
        </div>

        {/* 右侧：同意按钮 */}
        <button
          onClick={handleAgree}
          className='flex-shrink-0 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap border-2 theme-border theme-text-primary hover:opacity-80'
          style={{
            backgroundColor: 'var(--xhunt-web-bg)',
          }}
        >
          {t('privacyConsent.agreeButton')}
        </button>
      </div>
    </div>
  );
};

export default PrivacyConsent;
