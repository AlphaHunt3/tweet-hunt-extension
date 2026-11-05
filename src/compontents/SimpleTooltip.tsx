import React, { useState } from 'react';

export interface SimpleTooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  className?: string;
  placement?: 'top' | 'bottom';
  fullWidth?: boolean;
  disabled?: boolean;
  onlyWhenOverflow?: boolean;
}

/**
 * 轻量 Tooltip 组件
 * - 相对定位，跟随父元素 shadow DOM 样式
 * - 不创建 Portal，避免样式丢失问题
 * - 支持 placement (top / bottom) 及 fullWidth 自适应等宽
 */
export function SimpleTooltip({
  children,
  content,
  className = '',
  placement = 'top',
  fullWidth = false,
  disabled = false,
  onlyWhenOverflow = false,
}: SimpleTooltipProps) {
  const [show, setShow] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const isBottom = placement === 'bottom';

  const handleMouseEnter = () => {
    if (disabled || !content) return;

    if (onlyWhenOverflow && containerRef.current) {
      const target =
        (containerRef.current.firstElementChild as HTMLElement) ||
        containerRef.current;
      const isOverflowing =
        target.scrollWidth > target.clientWidth + 1 ||
        target.scrollHeight > target.clientHeight + 1;

      if (!isOverflowing) {
        return;
      }
    }

    setShow(true);
  };

  const handleMouseLeave = () => {
    setShow(false);
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${fullWidth ? 'block w-full' : 'inline-flex px-1.5 py-1 -mx-1.5 -my-1'} ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {show && (
        <div
          className={`absolute z-50 pointer-events-none ${
            fullWidth ? 'left-0 right-0 w-full' : 'left-1/2 -translate-x-1/2'
          } ${isBottom ? 'top-full mt-1.5' : 'bottom-full mb-1.5'}`}
        >
          <div
            className={`theme-bg-secondary theme-text-primary border theme-border shadow-xl text-xs ${
              fullWidth
                ? 'w-full px-2.5 py-2 rounded-xl whitespace-normal break-words leading-relaxed text-left'
                : 'px-2 py-1 rounded-md whitespace-nowrap shadow-lg'
            }`}
          >
            {content}
          </div>
          {/* 小三角箭头 */}
          {fullWidth ? (
            <div
              className={`absolute left-4 w-2 h-2 rotate-45 theme-bg-secondary border theme-border ${
                isBottom
                  ? '-top-1 border-r-0 border-b-0'
                  : '-bottom-1 border-l-0 border-t-0'
              }`}
            />
          ) : (
            <div
              className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 ${
                isBottom ? 'bottom-full' : 'top-full'
              }`}
              style={
                isBottom
                  ? {
                      border: '5px solid transparent',
                      borderBottomColor: 'var(--bg-secondary)',
                    }
                  : {
                      border: '5px solid transparent',
                      borderTopColor: 'var(--bg-secondary)',
                    }
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
