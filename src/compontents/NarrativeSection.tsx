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

  // 如果正在加载，显示加载状态（只占1行）
  if (isLoading) {
    return (
      <div className="w-full mt-3 px-3 py-2 rounded-lg" style={{
        backgroundColor: theme === 'dark' ? 'rgba(30, 39, 50, 0.3)' : 'rgba(243, 244, 246, 0.5)',
        border: theme === 'dark' ? '1px solid rgba(55, 65, 81, 0.3)' : '1px solid rgba(229, 231, 235, 0.5)'
      }}>
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-purple-400 flex-shrink-0" />
          <div className="animate-pulse flex-1">
            <div className="h-4 rounded w-3/4" style={{
              backgroundColor: theme === 'dark' ? 'rgba(55, 65, 81, 0.5)' : 'rgba(229, 231, 235, 0.7)'
            }}></div>
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
    <div className="w-full mt-3 px-3 py-2 rounded-lg" style={{
      backgroundColor: theme === 'dark' ? 'rgba(30, 39, 50, 0.3)' : 'rgba(243, 244, 246, 0.5)',
      border: theme === 'dark' ? '1px solid rgba(55, 65, 81, 0.3)' : '1px solid rgba(229, 231, 235, 0.5)'
    }}>
      <div className="flex items-start gap-2">
        <BookOpen className="w-4 h-4 text-purple-400 flex-shrink-0 mt-1" />
        <span className="text-sm font-medium theme-text-primary flex-shrink-0 mt-0.5">{t('narrative')}:</span>

        {/* 最多2行叙事内容 */}
        <div className="flex-1 min-w-0 relative">
          <p
            className="text-sm theme-text-primary relative px-3 leading-relaxed"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: '1.5'
            }}
          >
            <span className="absolute left-0 top-0 text-purple-400/50 text-base font-serif leading-none">"</span>
            <span className="mx-1">{narrativeText}</span>
            <span className="absolute right-0 top-0 text-purple-400/50 text-base font-serif leading-none">"</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export const NarrativeSection = React.memo(_NarrativeSection);
