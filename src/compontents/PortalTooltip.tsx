import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { subscribeToScroll } from '~contents/hooks/useGlobalScroll';
import { useLocalStorage } from '~storage/useLocalStorage.ts';

interface PortalTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: number;
  className?: string;
  fitContent?: boolean;
}

export const PortalTooltip: React.FC<PortalTooltipProps> = ({
  content,
  children,
  maxWidth = 320,
  className = '',
  fitContent = false,
}) => {
  const [theme] = useLocalStorage<'light' | 'dark'>('@xhunt/theme', 'dark');
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({
    top: 0,
    left: 0,
    placement: 'top' as 'top' | 'bottom',
  });
  const triggerRef = useRef<HTMLSpanElement>(null);

  const updatePos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) return;

    // 如果 trigger 已经滚出当前可视区域，直接隐藏
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      setShow(false);
      return;
    }

    // 靠屏幕上方（< 90px）时自动翻转到下方展示，避免顶部溢出
    const placeBottom = rect.top < 90;
    const top = placeBottom ? rect.bottom + 6 : rect.top - 6;

    // 自适应提示直接对齐触发元素，其它提示限制在视口内
    const centerX = rect.left + rect.width / 2;
    const halfWidth = maxWidth / 2;
    const left = fitContent
      ? centerX
      : Math.max(
          halfWidth + 12,
          Math.min(window.innerWidth - halfWidth - 12, centerX),
        );

    setPos({
      top,
      left,
      placement: placeBottom ? 'bottom' : 'top',
    });
  }, [fitContent, maxWidth]);

  // 仅在气泡显示时动态订阅全局滚动，隐藏时 0 监听器占用，杜绝无谓的性能开销
  useEffect(() => {
    if (!show) return;
    updatePos();
    const unsubscribe = subscribeToScroll(updatePos);
    return unsubscribe;
  }, [show, updatePos]);

  if (!content) {
    return <>{children}</>;
  }

  return (
    <span
      ref={triggerRef}
      className={`inline-flex items-center ${className}`}
      onMouseEnter={() => {
        updatePos();
        setShow(true);
      }}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              zIndex: 2147483647,
              pointerEvents: 'none',
              top: pos.top,
              left: pos.left,
              transform:
                pos.placement === 'bottom'
                  ? 'translate(-50%, 0)'
                  : 'translate(-50%, -100%)',
              width: fitContent ? 'max-content' : undefined,
              maxWidth,
              minWidth: fitContent ? undefined : 160,
              padding: '6px 10px',
              borderRadius: 8,
              fontSize: 11,
              lineHeight: 1.45,
              whiteSpace: 'normal',
              wordBreak: 'break-word',
              background: theme === 'light' ? '#ffffff' : '#1f2937',
              color: theme === 'light' ? '#111827' : '#f9fafb',
              border:
                theme === 'light'
                  ? '1px solid rgba(15, 23, 42, 0.15)'
                  : '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow:
                theme === 'light'
                  ? '0 8px 24px rgba(15, 23, 42, 0.18)'
                  : '0 8px 24px rgba(0, 0, 0, 0.35)',
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            }}
          >
            {content}
          </div>,
          document.body
        )}
    </span>
  );
};

export default PortalTooltip;
