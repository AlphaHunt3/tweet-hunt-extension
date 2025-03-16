import React, { useState } from 'react';
import { History, ChevronDown, ChevronUp } from 'lucide-react';
import { NameHistory } from '~types';
import dayjs from 'dayjs';

interface NameHistorySectionProps {
  data: NameHistory;
}

export function NameHistorySection({ data }: NameHistorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const formatDate = (date: string) => {
    return dayjs(date).format('YYYY.MM.DD');
  };

  const getNameHistoryCount = () => {
    return Object.keys(data?.screen_names || {}).length;
  };

  return (
    <div className="border-b border-gray-700 w-[300px]">
      <div
        className="p-3 flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-medium">Name History ({getNameHistoryCount()})</h2>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </div>

      <div className={`${isExpanded ? '' : 'h-0'} overflow-hidden transition-[height] duration-200`}>
        <div className="px-3 pb-3 space-y-2">
          {Object.entries(data?.screen_names).map(([name, dates]) => (
            <div key={name} className="flex items-center justify-between text-xs">
              <span className="font-medium text-gray-200">{name}</span>
              <div className="flex items-center gap-2 text-gray-400">
                <span>{formatDate(dates[0])}</span>
                <span>→</span>
                <span>{formatDate(dates[1])}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
