import  { useMemo, useState } from 'react';
import { Brain, ChevronDown, ChevronUp } from 'lucide-react';
import { MBTIData } from '~/types/index.ts';
import { useI18n } from '~contents/hooks/i18n.ts';
import { getMBTIColor } from '~contents/utils';

interface MBTISectionProps {
  data: MBTIData;
  isHoverPanel?: boolean;
}

export function MBTISection({ data, isHoverPanel }: MBTISectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { t } = useI18n();
  const mbtiColor = useMemo(() => getMBTIColor(data.mbti), [data.mbti]);

  return (
    <div className={`theme-border ${isHoverPanel ? '' : 'border-b'}`}>
      <div
        className="p-3 flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-medium theme-text-primary">{t('personalityType')}</h2>
          <span className={`text-sm font-bold ${mbtiColor}`}>
            {data.mbti}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 theme-text-secondary" />
        ) : (
          <ChevronDown className="w-4 h-4 theme-text-secondary" />
        )}
      </div>

      <div className={`${isExpanded ? '' : 'h-0'} overflow-hidden transition-[height] duration-200`}>
        <div className="px-3 pb-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            {(data.keyword || []).map((keyword, index) => (
              <span
                key={index}
                className="px-2 py-1 theme-bg-tertiary rounded-full text-xs theme-text-primary"
              >
                {keyword}
              </span>
            ))}
          </div>
          <p className="text-xs theme-text-secondary leading-relaxed">
            {data.explanation}
          </p>
        </div>
      </div>
    </div>
  );
}
