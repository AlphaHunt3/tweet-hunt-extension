import React, { useState } from 'react';

interface SimpleTooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  className?: string;
}

/**
 * 轻量 Tooltip 组件
 * - 相对定位，跟随父元素 shadow DOM 样式
 * - 不创建 Portal，避免样式丢失问题
 * - 适合简单的文字提示场景
 */
export function SimpleTooltip({
  children,
  content,
  className = '',
}: SimpleTooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <div
      className={`relative inline-flex px-1.5 py-1 -mx-1.5 -my-1 ${className}`}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className='absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 pointer-events-none'>
          <div className='theme-bg-secondary theme-text-primary theme-border px-2 py-1 rounded-md text-xs whitespace-nowrap shadow-lg'>
            {content}
          </div>
          {/* 小三角箭头 */}
          <div
            className='absolute top-full left-1/2 -translate-x-1/2 w-0 h-0'
            style={{
              border: '5px solid transparent',
              borderTopColor: 'var(--bg-secondary)',
            }}
          />
        </div>
      )}
    </div>
  );
}
