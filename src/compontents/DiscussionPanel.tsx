import React, { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { DiscussionData } from '~types';
import { useI18n } from '~contents/hooks/i18n.ts';

interface DiscussionPanelProps {
  data: DiscussionData | null | undefined;
  period: '1d' | '7d';
  loading?: boolean;
}

function _DiscussionPanel({ data, period, loading }: DiscussionPanelProps) {
  const { t, lang } = useI18n();
  const discussionData = useMemo(() => {
    if (!data) return null;
    if (period === '1d') {
      return lang === 'zh' ? data.discussion1dCn : data.discussion1dEn;
    } else {
      return lang === 'zh' ? data.discussion7dCn : data.discussion7dEn;
    }
  }, [data, period, lang]);

  if (loading) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-w-[300px] min-h-[100px] gap-3">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        <p className="text-sm theme-text-secondary">{t('aiThinking')}</p>
      </div>
    );
  }
  if (!discussionData) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-w-[300px] min-h-[100px] gap-3">
        <p className="text-sm theme-text-secondary">{"No Data"}</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 min-w-[300px]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-green-400 rounded-full"></div>
          <span className="text-xs theme-text-secondary">{discussionData.positivePercentage}% {t('positive')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-red-400 rounded-full"></div>
          <span className="text-xs theme-text-secondary">{discussionData.negativePercentage}% {t('negative')}</span>
        </div>
      </div>

      {discussionData.positiveBulletPoints.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-green-400">{t('positivePoints')}:</h4>
          <ul className="space-y-1">
            {discussionData.positiveBulletPoints.map((point, index) => (
              <li key={index} className="text-xs theme-text-primary leading-relaxed pl-4 relative">
                <span className="absolute left-0 top-1.5 w-1.5 h-1.5 bg-green-400/30 rounded-full"></span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {discussionData.negativeBulletPoints.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-red-400">{t('negativePoints')}:</h4>
          <ul className="space-y-1">
            {discussionData.negativeBulletPoints.map((point, index) => (
              <li key={index} className="text-xs theme-text-primary leading-relaxed pl-4 relative">
                <span className="absolute left-0 top-1.5 w-1.5 h-1.5 bg-red-400/30 rounded-full"></span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export const DiscussionPanel = React.memo(_DiscussionPanel);
