import React, { useState } from 'react';

interface StatItemProps {
  label: string;
  value: string | number;
  hoverContent: React.ReactNode;
  valueClassName?: string;
}

export function HoverStatItem({ label, value, hoverContent, valueClassName = '' }: StatItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative group mr-6"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-1 cursor-pointer">
        {/*text-gray-400*/}
        <span className="text-base">{label}</span>
        <span className={`text-base font-medium ${valueClassName}`}>
          ({value})
        </span>
      </div>

      {/* Hover Panel */}
      {isHovered && (
        <div className="absolute bottom-full left-0 mb-2 w-max max-w-[320px] bg-[#1a2634] rounded-lg shadow-lg border border-gray-700/50 z-50">
          <div className="p-3">{hoverContent}</div>
          {/* Arrow */}
          <div className="absolute bottom-[-6px] left-4 w-3 h-3 rotate-45 bg-[#1a2634] border-r border-b border-gray-700/50"></div>
        </div>
      )}
    </div>
  );
}
