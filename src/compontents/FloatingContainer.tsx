import React, {
  forwardRef,
  useImperativeHandle,
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { useLatest, useMemoizedFn, useUpdateEffect } from 'ahooks';
import { useGlobalScroll } from '~contents/hooks/useGlobalScroll';
import { useGlobalResize } from '~contents/hooks/useGlobalResize';

export interface FloatingContainerProps {
  children?: React.ReactNode;
  targetRef: React.RefObject<HTMLElement>;
  offsetX?: number;
  offsetY?: number;
  maxWidth?: string;
  maxHeight?: string;
  mask?: boolean;
  className?: string;
  onClose?: () => void;
  defaultVisible?: boolean;
  pinned?: boolean;
}

export interface FloatingContainerRef {
  show: () => void;
  hide: () => void;
  toggle: () => void;
  // isVisible: boolean;
}

export const FloatingContainer = forwardRef<
  FloatingContainerRef,
  FloatingContainerProps
>(
  (
    {
      children,
      targetRef,
      offsetX = 10,
      offsetY = 10,
      maxWidth = '80vw',
      maxHeight = '80vh',
      mask = true,
      className = '',
      onClose,
      defaultVisible = false,
      pinned = false,
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = useState(Boolean(defaultVisible));
    const isVisibleRef = useLatest(isVisible);
    const containerRef = useRef<HTMLDivElement>(null);

    // 使用 ref 保存最新的 offset 值，确保 updatePosition 始终使用最新值
    const offsetRef = useRef({ offsetX, offsetY });
    offsetRef.current = { offsetX, offsetY };

    const updatePosition = useMemoizedFn(() => {
      try {
        const target = targetRef.current;
        const container = containerRef.current;
        if (!target || !container || !isVisible) return;

        const targetRect = target.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const isTargetVisible =
          targetRect.top < viewportHeight &&
          targetRect.bottom > 0 &&
          targetRect.left < viewportWidth &&
          targetRect.right > 0;
        if (!isTargetVisible) {
          setIsVisible(false);
          return;
        }

        // 使用 ref 中的最新 offset 值
        const { offsetX: currentOffsetX, offsetY: currentOffsetY } = offsetRef.current;
        let left = targetRect.left + currentOffsetX;
        let top = targetRect.top + currentOffsetY;

        const adjustPosition = (
          pos: number,
          size: number,
          elementSize: number
        ) => Math.min(Math.max(pos, 0), Math.max(0, size - elementSize));

        left = adjustPosition(left, viewportWidth, containerRect.width);
        top = adjustPosition(top, viewportHeight, containerRect.height);
        container.style.left = `${left}px`;
        container.style.top = `${top}px`;
        // container.style.opacity = '1';
      } catch (err) {
        console.log('Error updating position:', err);
      }
    });

    // 显示时更新位置
    useEffect(() => {
      if (isVisible) {
        // 使用双重 RAF 确保 DOM 更新完成后再定位
        requestAnimationFrame(() => {
          requestAnimationFrame(updatePosition);
        });
      }
    }, [isVisible, updatePosition]);

    // 监听目标元素变化
    useUpdateEffect(() => {
      if (isVisible) {
        updatePosition();
      }
    }, [targetRef.current]);

    // 监听容器尺寸变化
    useUpdateEffect(() => {
      if (isVisible && containerRef.current) {
        updatePosition();
      }
    }, [containerRef.current?.offsetWidth, containerRef.current?.offsetHeight]);

    // 监听偏移量变化
    useEffect(() => {
      if (isVisible) {
        updatePosition();
      }
    }, [offsetX, offsetY, isVisible, updatePosition]);

    // 监听可见性变化，仅在经历过显示后才触发 onClose
    const hasBeenVisibleRef = useRef(false);
    useEffect(() => {
      if (isVisible) {
        hasBeenVisibleRef.current = true;
        return;
      }
      if (hasBeenVisibleRef.current && onClose) {
        onClose();
      }
    }, [isVisible, onClose]);

    // 滚动时更新位置（固定模式下不跟随）
    useGlobalScroll(() => {
      if (!isVisibleRef.current || pinned) return;
      updatePosition();
    }, [updatePosition, pinned]);

    // 窗口大小变化时更新位置（固定模式下不跟随）
    useGlobalResize(() => {
      if (!isVisibleRef.current || pinned) return;
      updatePosition();
    }, [updatePosition, pinned]);

    // 暴露方法
    useImperativeHandle(
      ref,
      () => ({
        show: () => {
          // 检查目标元素是否存在
          if (!targetRef.current) {
            // console.log(
            //   'FloatingContainer: target element not found, cannot show'
            // );
            return;
          }
          // 立即设置可见状态，避免异步延迟导致的展示问题
          setIsVisible(true);
        },
        hide: () => setIsVisible(false),
        toggle: () => setIsVisible((prev) => !prev),
      }),
      []
    );

    return (
      <>
        <div
          key={JSON.stringify(ref)}
          ref={containerRef}
          style={{
            position: 'fixed',
            zIndex: 9999,
            maxWidth,
            maxHeight,
            overflow: 'auto',
            display: isVisible ? 'block' : 'none',
            pointerEvents: isVisible ? 'auto' : 'none',
            opacity: isVisible ? 1 : 0,
            transition: '200ms',
          }}
          className={`shadow-[0_8px_24px_rgba(0,0,0,0.25)] theme-border rounded-lg ${className}`}
        >
          {children}
        </div>
        {mask && (
          <div
            style={{
              width: '100vw',
              height: '100vh',
              position: 'fixed',
              zIndex: 9998,
              backgroundColor: 'transparent',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0,
              cursor: 'default',
              display: isVisible ? 'block' : 'none',
              pointerEvents: isVisible && !pinned ? 'auto' : 'none',
            }}
            onClick={() => {
              // 固定模式下点击外部不关闭
              if (!pinned) {
                setIsVisible(false);
              }
            }}
          />
        )}
      </>
    );
  }
);

FloatingContainer.displayName = 'FloatingContainer';
