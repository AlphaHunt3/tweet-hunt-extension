import { useState, useEffect, useCallback } from 'react';
import { useGlobalScroll } from '~contents/hooks/useGlobalScroll';
import { useGlobalResize } from '~contents/hooks/useGlobalResize';

export interface UseAnchorPositionOptions {
  anchorRef?: React.RefObject<HTMLElement | null>;
  containerRef?: React.RefObject<HTMLElement | null>;
  modalRef: React.RefObject<HTMLElement | null>;
  isOpen: boolean;
  defaultWidth?: number;
  defaultHeight?: number;
  minMarginTop?: number;
  minMarginBottom?: number;
}

export interface AnchorPosition {
  top: number;
  left: number;
  maxHeight: number;
}

/**
 * 计算弹框跟随目标锚点（如投票卡片区域）的位置，并在视口上下留足安全距离（最少 80px）
 * 顶部对齐投票卡片顶部；水平居中对齐当前投票卡片
 */
export function useAnchorPosition({
  anchorRef,
  containerRef,
  modalRef,
  isOpen,
  defaultWidth = 330,
  defaultHeight = 220,
  minMarginTop = 80,
  minMarginBottom = 80,
}: UseAnchorPositionOptions): AnchorPosition {
  const [position, setPosition] = useState<AnchorPosition>(() => {
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
    const maxViewportTop = Math.max(
      minMarginTop,
      viewportHeight - defaultHeight - minMarginBottom
    );
    const initialTop = Math.max(
      minMarginTop,
      Math.min((viewportHeight - defaultHeight) / 2, maxViewportTop)
    );
    const initialLeft = Math.max(16, (viewportWidth - defaultWidth) / 2);

    return {
      top: Math.round(initialTop),
      left: Math.round(initialLeft),
      maxHeight: Math.max(160, viewportHeight - minMarginTop - minMarginBottom),
    };
  });

  const updatePosition = useCallback(() => {
    if (!isOpen) return;

    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
    const modal = modalRef.current;
    const modalWidth = modal?.offsetWidth || defaultWidth;
    const modalHeight = modal?.offsetHeight || defaultHeight;

    const availableHeight = Math.max(160, viewportHeight - minMarginTop - minMarginBottom);
    const maxViewportTop = Math.max(minMarginTop, viewportHeight - modalHeight - minMarginBottom);

    const container = containerRef?.current;

    const idealViewportTop = (viewportHeight - modalHeight) / 2;
    const idealViewportLeft = (viewportWidth - modalWidth) / 2;

    // 视口上下安全边界约束：最少留出 minMarginTop 与 minMarginBottom（默认各 80px）
    const clampedViewportTop = Math.max(minMarginTop, Math.min(idealViewportTop, maxViewportTop));

    // 视口左右边界安全约束：留出最少 16px
    const maxViewportLeft = Math.max(16, viewportWidth - modalWidth - 16);
    const clampedViewportLeft = Math.max(16, Math.min(idealViewportLeft, maxViewportLeft));

    // 转换为相对容器的偏移量
    const containerRect = container ? container.getBoundingClientRect() : { top: 0, left: 0 };
    const top = Math.max(0, clampedViewportTop - containerRect.top);
    const left = Math.max(0, clampedViewportLeft - (containerRect.left || 0));

    setPosition((prev) => {
      const nextTop = Math.round(top);
      const nextLeft = Math.round(left);
      const nextMaxHeight = Math.round(availableHeight);
      if (prev.top === nextTop && prev.left === nextLeft && prev.maxHeight === nextMaxHeight) {
        return prev;
      }
      return {
        top: nextTop,
        left: nextLeft,
        maxHeight: nextMaxHeight,
      };
    });
  }, [
    isOpen,
    anchorRef,
    containerRef,
    modalRef,
    defaultWidth,
    defaultHeight,
    minMarginTop,
    minMarginBottom,
  ]);

  // 打开时立即计算，并在下一次绘制帧（DOM 真实渲染测算后）再次精确定位
  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const rafId = requestAnimationFrame(() => {
        updatePosition();
      });
      return () => cancelAnimationFrame(rafId);
    }
  }, [isOpen, updatePosition]);

  // 页面滚动与窗口尺寸变化时自动跟随更新
  useGlobalScroll(updatePosition, [updatePosition]);
  useGlobalResize(updatePosition, [updatePosition]);

  return position;
}
