import React, { useState } from 'react';

interface StatItemProps {
  label: string;
  value: string | number;
  hoverContent: React.ReactNode;
  valueClassName?: string;
  labelClassName?: string;
  className?: string;
}

export function HoverStatItem({ label, value, hoverContent, valueClassName = '', labelClassName = '', className = '' }: StatItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`relative mr-6 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={(e) => {
        // 检查鼠标是否移动到悬浮面板上
        const rect = e.currentTarget.getBoundingClientRect();
        const isInPanel = e.clientY < rect.top &&
          e.clientX >= rect.left &&
          e.clientX <= rect.left + rect.width;
        if (!isInPanel) {
          setIsHovered(false);
        }
      }}
    >
      <div className="flex items-center gap-1 cursor-pointer">
        <span className={`text-sm ${labelClassName}`}>{label}</span>
        <span className={`text-sm ${valueClassName}`}>{value}</span>
        {/*<div className={"absolute z-50 bottom-[2px] w-full h-[1px] bg-[transparent] hover:bg-[#eeeeeee8]"}></div>*/}
      </div>

      {/* Hover Panel Container */}
      {isHovered && hoverContent && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[320px] z-50"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Panel Content */}
          <div className="bg-[#1a2634] rounded-lg shadow-lg border border-gray-700/50 p-1">
            {hoverContent}
          </div>
          {/* Arrow - Centered */}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-[6px] w-3 h-3 rotate-45 bg-[#1a2634] border-r border-b border-gray-700/50"></div>
        </div>
      )}
    </div>
  );
}
