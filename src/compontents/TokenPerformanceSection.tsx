import { useMemo, useState } from 'react';
import { TrendingUp, Hash } from 'lucide-react';
import { KolData, TokenPeriodType } from '~types';
import TokenWordCloud from './TokenWordCloud';
import { useI18n } from '~contents/hooks/i18n.ts';
import { formatPercentage } from '~contents/utils';

interface TokenPerformanceSectionProps {
  kolData: KolData;
  defaultPeriod?: TokenPeriodType;
  mode?: 'WordCloud' | 'Metrics' | 'Default'
  isHoverPanel?: boolean
}

export function TokenPerformanceSection({ kolData, defaultPeriod, mode = 'Default', isHoverPanel = false }: TokenPerformanceSectionProps) {
  const [activePeriod, setActivePeriod] = useState<TokenPeriodType>(defaultPeriod || 'day30');
  const { t } = useI18n();

  const getActivePeriodData = () => {
    return kolData?.kolTokenMention?.[activePeriod] || {
      tokenMentions: [],
      winRate: null,
      maxProfitAvgPct: null,
      nowProfitAvgPct: null,
      winRatePct: null,
      maxProfitAvg: null,
      nowProfitAvg: null
    };
  };

  const periodData = useMemo(() => getActivePeriodData(), [activePeriod, kolData]);
  return (
    <div className={`p-3 theme-border ${!isHoverPanel ? 'border-b' : ''}`}>
      {mode === 'Default' && <div className="flex items-center gap-2 mb-3">
				<TrendingUp className="w-4 h-4 text-green-600" />
				<h2 className="font-bold text-sm">{t('tokenPerformance')}</h2>
			</div>}

      {/* Period Tabs */}
      {mode === 'Default' && <div className="flex mb-3 border-b theme-border">
				<button
					className={`flex-1 text-xs py-2 font-medium transition-colors ${
            activePeriod === 'day7' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'
          }`}
					onClick={() => setActivePeriod('day7')}
				>
					7D
				</button>
				<button
					className={`flex-1 text-xs py-2 font-medium transition-colors ${
            activePeriod === 'day30' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'
          }`}
					onClick={() => setActivePeriod('day30')}
				>
					30D
				</button>
				<button
					className={`flex-1 text-xs py-2 font-medium transition-colors ${
            activePeriod === 'day90' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'
          }`}
					onClick={() => setActivePeriod('day90')}
				>
					90D
				</button>
			</div>}

      {/* Token Word Cloud */}
      {mode !== 'Metrics' && periodData?.tokenMentions && periodData?.tokenMentions?.length ? <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Hash className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-medium text-gray-300">{t('mentionedTokens')}</h3>
        </div>
        <div className="w-full bg-[#101823] rounded-md overflow-hidden">
          <TokenWordCloud tokens={periodData?.tokenMentions || []} height={60 + Math.min(periodData?.tokenMentions?.length / 20, 1) * 80} />
        </div>
      </div> : null}


      {/* Performance Metrics */}
      {mode !== 'WordCloud' && <div className="grid grid-cols-1 gap-3 mt-4">
				<div className="space-y-1">
					<div className="flex items-center justify-between">
						<span className="text-xs text-gray-400">Win Rate</span>
						<span className="text-xs font-medium">
              {formatPercentage(periodData?.winRate)}
							<span className={'text-blue-400 ml-1'}>(TOP {formatPercentage(periodData?.winRatePct)})</span>
            </span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-xs text-gray-400">Avg Max Profit</span>
						<span className={`text-xs font-medium ${!periodData?.maxProfitAvg ? '' : (periodData?.maxProfitAvg >= 0 ? 'text-green-600' : 'text-red-400')}`}>
              {!periodData?.maxProfitAvg ? 'N/A' :
                (periodData?.maxProfitAvg >= 0 ? '+' : '') + formatPercentage(periodData?.maxProfitAvg)}
							<span className={'text-blue-400 ml-1'}>(TOP {formatPercentage(periodData?.maxProfitAvgPct)})</span>
            </span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-xs text-gray-400">Avg Now Profit</span>
						<span className={`text-xs font-medium ${!periodData?.nowProfitAvg ? '' : (periodData?.nowProfitAvg >= 0 ? 'text-green-600' : 'text-red-400')}`}>
              {!periodData?.nowProfitAvg ? 'N/A' :
                (periodData?.nowProfitAvg >= 0 ? '+' : '') + formatPercentage(periodData?.nowProfitAvg)}
							<span className={'text-blue-400 ml-1'}>(TOP {formatPercentage(periodData?.nowProfitAvgPct)})</span>
            </span>
					</div>
				</div>
			</div>}
    </div>
  );
}
