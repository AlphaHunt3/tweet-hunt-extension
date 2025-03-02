import React, { useMemo, useState } from 'react';
import { TrendingUp, Hash } from 'lucide-react';
import { KolData, TokenPeriodType } from '~types';
import numeral from 'numeral';
import TokenWordCloud from './TokenWordCloud';

interface TokenPerformanceSectionProps {
  kolData: KolData;
}

export function TokenPerformanceSection({ kolData }: TokenPerformanceSectionProps) {
  const [activePeriod, setActivePeriod] = useState<TokenPeriodType>('day30');

  const formatPercentage = (num: number | null | undefined) => {
    if (!num) return 'N/A';
    return numeral(num).format('0.0%');
  };

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
    <div className="p-3 border-b border-gray-700">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-green-400" />
        <h2 className="font-bold text-sm">Mentioned Token Performance</h2>
      </div>

      {/* Period Tabs */}
      <div className="flex mb-3 border-b border-gray-700/50">
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
      </div>

      {/* Token Word Cloud */}
      {periodData?.tokenMentions && periodData?.tokenMentions?.length ? <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Hash className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-medium text-gray-300">Mentioned Tokens</h3>
        </div>
        <div className="w-full bg-[#101823] rounded-md overflow-hidden">
          <TokenWordCloud tokens={periodData?.tokenMentions || []} height={50 + Math.min(periodData?.tokenMentions?.length / 10, 1) * 90} />
        </div>
      </div> : null}


      {/* Performance Metrics */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Win Rate</span>
            <span className="text-xs font-medium">
              {formatPercentage(periodData?.winRate)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Max Profit</span>
            <span className="text-xs font-medium text-green-400">
              {periodData?.maxProfitAvg ? `+${formatPercentage(periodData?.maxProfitAvg)}` : 'N/A'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Current</span>
            <span className={`text-xs font-medium ${!periodData?.nowProfitAvg ? '' : (periodData?.nowProfitAvg >= 0 ? 'text-green-400' : 'text-red-400')}`}>
              {!periodData?.nowProfitAvg ? 'N/A' :
                (periodData?.nowProfitAvg >= 0 ? '+' : '') + formatPercentage(periodData?.nowProfitAvg)}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Win Rate %</span>
            <span className="text-xs font-medium">
              {formatPercentage(periodData?.winRatePct)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Max Profit %</span>
            <span className="text-xs font-medium text-green-400">
              +{formatPercentage(periodData?.maxProfitAvgPct)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Current %</span>
            <span className={`text-xs font-medium ${periodData?.nowProfitAvgPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {periodData?.nowProfitAvgPct >= 0 ? '+' : ''}
              {formatPercentage(periodData?.nowProfitAvgPct)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
