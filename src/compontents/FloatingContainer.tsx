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
  detachFromAnchor: () => void; // 脱离锚点，居中显示
  attachToAnchor: () => void; // 重新回归锚点
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
    const [isDetached, setIsDetached] = useState(false); // 是否脱离锚点
    const isDetachedRef = useLatest(isDetached);
    const rafIdRef = useRef<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const updatePosition = useMemoizedFn(() => {
      try {
        const container = containerRef.current;
        if (!container || !isVisible) return;

        const containerRect = container.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // 如果已脱离锚点，使用居中定位
        if (isDetachedRef.current) {
          const left = (viewportWidth - containerRect.width) / 2;
          const top = (viewportHeight - containerRect.height) / 2;
          container.style.left = `${Math.max(0, left)}px`;
          container.style.top = `${Math.max(0, top)}px`;
          return;
        }

        // 否则使用锚点定位
        const target = targetRef.current;
        if (!target) return;

        const targetRect = target.getBoundingClientRect();

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
        ) => Math.min(Math.max(pos, 40), Math.max(20, size - elementSize - 40));

        left = adjustPosition(left, viewportWidth, containerRect.width);
        top = adjustPosition(top, viewportHeight, containerRect.height);
        container.style.left = `${left}px`;
        container.style.top = `${top}px`;
        // container.style.opacity = '1';
      } catch (err) {
        console.log('Error updating position:', err);
      }
    });

    // 显示时或脱离/回归锚点时更新位置
    useEffect(() => {
      if (isVisible) {
        // 使用双重 RAF 确保 DOM 更新完成后再定位
        requestAnimationFrame(() => {
          requestAnimationFrame(updatePosition);
        });
      }
    }, [isVisible, isDetached, updatePosition]);

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

    // 监听内容宽度变化，重新计算位置
    useEffect(() => {
      if (!isVisible || !containerRef.current) return;

      const resizeObserver = new ResizeObserver(() => {
        if (isVisible) {
          requestAnimationFrame(() => {
            updatePosition();
          });
        }
      });

      resizeObserver.observe(containerRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    }, [isVisible, updatePosition]);

    // 监听可见性变化，调用 onClose 回调
    useEffect(() => {
      if (!isVisible && onClose) {
        onClose();
      }
    }, [isVisible, onClose]);

    // 滚动时更新位置（仅在锚定状态下）
    useEventListener(
      'scroll',
      () => {
        if (rafIdRef.current || !isVisibleRef.current || isDetachedRef.current)
          return;
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
        detachFromAnchor: () => {
          setIsDetached(true);
          // 立即更新位置到居中
          requestAnimationFrame(() => {
            requestAnimationFrame(updatePosition);
          });
        },
        attachToAnchor: () => {
          setIsDetached(false);
          // 立即更新位置回锚点
          requestAnimationFrame(() => {
            requestAnimationFrame(updatePosition);
          });
        },
      }),
      [updatePosition]
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
            transition: '100ms',
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
