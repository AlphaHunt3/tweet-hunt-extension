import React, { useEffect, useState } from 'react';
import { useDocumentVisibility } from 'ahooks';

interface StatItemProps {
  label: string;
  value: string | number | React.ReactNode;
  hoverContent: React.ReactNode;
  valueClassName?: string;
  labelClassName?: string;
  className?: string;
}

export function HoverStatItem({
  label,
  value,
  hoverContent,
  valueClassName = '',
  labelClassName = '',
  className = '',
}: StatItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  // 处理 main[role] 的 z-index
  useEffect(() => {
    const mainElement = document.querySelector('main[role]') as HTMLElement;
    if (!mainElement) return;

    if (isHovered) {
      mainElement.style.zIndex = '50';
    } else {
      mainElement.style.zIndex = '0';
    }

    // 监听窗口变化，恢复 z-index
    const handleResize = () => {
      mainElement.style.zIndex = '0';
    };

    window.addEventListener('resize', handleResize);

    return () => {
      mainElement.style.zIndex = '0'; // 清理时恢复 z-index
      window.removeEventListener('resize', handleResize);
    };
  }, [isHovered]);
  return (
    <div
      className={`relative mr-6 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={(e) => {
        // 检查鼠标是否移动到悬浮面板上
        const rect = e.currentTarget.getBoundingClientRect();
        const isInPanel =
          e.clientY < rect.top &&
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
      </div>

      {/* Hover Panel Container */}
      {isHovered && hoverContent && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[320px] z-50"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Panel Content */}
          <div className="bg-[#1a2634] text-white rounded-lg shadow-lg border border-gray-700/50 p-1">
            {hoverContent}
          </div>
          {/* Arrow - Centered */}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-[6px] w-3 h-3 rotate-45 bg-[#1a2634] border-r border-b border-gray-700/50"></div>
        </div>
      )}
    </div>
  );
}
