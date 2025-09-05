import React, {
  forwardRef,
  useImperativeHandle,
  useState,
  useRef,
  useEffect,
} from 'react';
import {
  useEventListener,
  useLatest,
  useMemoizedFn,
  useUpdateEffect,
} from 'ahooks';

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
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = useState(false);
    const isVisibleRef = useLatest(isVisible);
    const rafIdRef = useRef<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

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

        let left = targetRect.left + offsetX;
        let top = targetRect.top + offsetY;

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

    // 监听可见性变化，调用 onClose 回调
    useEffect(() => {
      if (!isVisible && onClose) {
        onClose();
      }
    }, [isVisible, onClose]);

    // 滚动和窗口大小变化时更新位置
    useEventListener(
      'scroll',
      () => {
        if (rafIdRef.current || !isVisibleRef.current) return;
        rafIdRef.current = requestAnimationFrame(() => {
          updatePosition();
          rafIdRef.current = null;
        });
      },
      { target: document }
    );

    useEventListener('resize', () => {
      if (rafIdRef.current || !isVisibleRef.current) return;
      rafIdRef.current = requestAnimationFrame(() => {
        updatePosition();
        rafIdRef.current = null;
      });
    });

    // 暴露方法
    useImperativeHandle(
      ref,
      () => ({
        show: () => {
          // 检查目标元素是否存在
          if (!targetRef.current) {
            console.warn(
              'FloatingContainer: target element not found, cannot show'
            );
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
            transition: '10ms',
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
              pointerEvents: isVisible ? 'auto' : 'none',
            }}
            onClick={() => {
              setIsVisible(false);
            }}
          />
        )}
      </>
    );
  }
);

FloatingContainer.displayName = 'FloatingContainer';
