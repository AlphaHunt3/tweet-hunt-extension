import React from 'react';
import { BookOpen } from 'lucide-react';
import { NarrativeData } from '~types';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useLocalStorage } from '~storage/useLocalStorage.ts';

interface NarrativeSectionProps {
  narrative: NarrativeData | null | undefined;
  isLoading?: boolean;
}

function _NarrativeSection({ narrative, isLoading }: NarrativeSectionProps) {
  const { t, lang } = useI18n();
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const cardStyle = {
    backgroundColor:
      theme === 'dark' ? 'rgba(255, 255, 255, 0.025)' : 'rgba(15, 20, 25, 0.025)',
  };
  const iconStyle = {
    color: theme === 'dark' ? 'rgba(192, 132, 252, 0.72)' : 'rgba(147, 51, 234, 0.62)',
    backgroundColor:
      theme === 'dark' ? 'rgba(168, 85, 247, 0.07)' : 'rgba(168, 85, 247, 0.045)',
  };

  // 如果正在加载，显示加载状态（只占1行）
  if (isLoading) {
    return (
      <div className='w-full mt-2.5 px-3 py-2 rounded-xl' style={cardStyle}>
        <div className='flex items-center gap-2'>
          <span
            className='inline-flex h-5 w-5 items-center justify-center rounded-full flex-shrink-0'
            style={iconStyle}
          >
            <BookOpen className='w-3.5 h-3.5' />
          </span>
          <div className='animate-pulse flex-1'>
            <div
              className='h-3.5 rounded w-3/4'
              style={{
                backgroundColor:
                  theme === 'dark'
                    ? 'rgba(55, 65, 81, 0.46)'
                    : 'rgba(148, 163, 184, 0.22)',
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // 如果没有叙事数据，不显示
  if (!narrative) {
    return null;
  }

  // 根据语言选择对应的叙事内容
  const narrativeText = lang === 'zh' ? narrative.cn : narrative.en;

  // 如果叙事内容为空，不显示
  if (!narrativeText || narrativeText.trim() === '') {
    return null;
  }

  return (
    <div className='w-full mt-2.5 px-3 py-2 rounded-xl' style={cardStyle}>
      <div className='flex items-start gap-2'>
        <span
          className='mt-[1px] inline-flex h-5 w-5 items-center justify-center rounded-full flex-shrink-0'
          style={iconStyle}
        >
          <BookOpen className='w-3.5 h-3.5' />
        </span>

        {/* 最多2行叙事内容 */}
        <p
          className='min-w-0 flex-1 text-[13px] theme-text-primary'
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: '1.45',
          }}
        >
          <span className='mr-1.5 text-[12px] font-medium theme-text-secondary'>
            {t('narrative')}
          </span>
          {narrativeText}
        </p>
      </div>
    </div>
  );
}

export const NarrativeSection = React.memo(_NarrativeSection);
