import React, { forwardRef, useEffect, useRef, useState } from 'react';
import Draggable from 'react-draggable';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { useDebounceFn } from 'ahooks';
import { useGlobalResize } from '~contents/hooks/useGlobalResize';

interface DraggablePanelProps {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  dragHandleClassName?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  width: number;
  storageKey?: string; // 新增：用于存储位置的键名
}

export const DraggablePanel = forwardRef<HTMLDivElement, DraggablePanelProps>(
  (
    {
      children,
      className = '',
      disabled = false,
      dragHandleClassName,
      onMouseEnter,
      onMouseLeave,
      width,
      storageKey = 'default-panel', // 默认存储键名
    },
    _ref
  ) => {
    const nodeRef = useRef<HTMLDivElement | null>(null);

    // 使用 localStorage 记住位置，获取加载状态
    // 改为存储距离右边的距离而不是绝对位置
    const [savedPosition, setSavedPosition, { isLoading }] = useLocalStorage(
      `@panel-position/${storageKey}`,
      {
        rightOffset: 16, // 距离右边的距离
        y: 50,
      }
    );

    // 等待存储加载完成后再初始化位置
    const [position, setPosition] = useState<{ x: number; y: number } | null>(
      null
    );

    // 防抖保存位置 - 拖拽停止1秒后才写入存储
    const { run: debouncedSavePosition } = useDebounceFn(
      (newPosition: { x: number; y: number }) => {
        requestIdleCallback(
          () => {
            // 计算距离右边的距离
            const rightOffset = window.innerWidth - newPosition.x - width;
            setSavedPosition({
              rightOffset: Math.max(16, rightOffset), // 确保最小距离
              y: newPosition.y,
            });
          },
          {
            timeout: 200,
          }
        );
      },
      {
        wait: 1500, // 1.5秒延迟
        leading: false,
        trailing: true,
      }
    );

    // 根据右侧距离计算 x 坐标
    const calculateXFromRightOffset = (rightOffset: number) => {
      return window.innerWidth - width - rightOffset;
    };

    // 🎯 智能边界检测和位置调整
    const adjustPositionForBoundaries = (targetX: number, targetY: number) => {
      const minX = 16;
      const maxX = window.innerWidth - width - 16;
      const minY = 16;
      const maxY = window.innerHeight - 100;

      // 调整 X 坐标
      let adjustedX = targetX;
      if (targetX < minX) {
        adjustedX = minX;
      } else if (targetX > maxX) {
        adjustedX = maxX;
      }

      // 调整 Y 坐标
      let adjustedY = targetY;
      if (targetY < minY) {
        adjustedY = minY;
      } else if (targetY > maxY) {
        adjustedY = maxY;
      }

      return { x: adjustedX, y: adjustedY };
    };

    // 当存储加载完成后，初始化位置
    useEffect(() => {
      if (!isLoading && !position) {
        // 根据保存的右侧距离计算 x 坐标
        const targetX = calculateXFromRightOffset(savedPosition.rightOffset);
        const targetY = savedPosition.y;

        // 🎯 应用智能边界检测
        const adjustedPosition = adjustPositionForBoundaries(targetX, targetY);

        setPosition(adjustedPosition);

        // 如果位置需要调整，立即保存调整后的位置
        const newRightOffset = window.innerWidth - adjustedPosition.x - width;
        if (
          Math.abs(newRightOffset - savedPosition.rightOffset) > 1 ||
          adjustedPosition.y !== savedPosition.y
        ) {
          setSavedPosition({
            rightOffset: Math.max(16, newRightOffset),
            y: adjustedPosition.y,
          });
        }
      }
    }, [isLoading, savedPosition, width, position, setSavedPosition]);

    const handleDrag = (_e: any, data: { x: number; y: number }) => {
      // 立即更新UI位置
      setPosition(data);
    };

    const handleDragStop = (_e: any, data: { x: number; y: number }) => {
      // 🎯 应用智能边界检测
      const boundedPosition = adjustPositionForBoundaries(data.x, data.y);

      // 立即更新UI位置
      setPosition(boundedPosition);

      // 防抖保存到 localStorage（1.5秒后）
      debouncedSavePosition(boundedPosition);
    };

    // 窗口大小变化时调整位置 - 保持右侧距离不变，但确保不超出边界
    useEffect(() => {
      if (!position) return; // 位置还未初始化时不处理

      const handleResize = () => {
        // 根据当前保存的右侧距离重新计算 x 坐标
        const targetX = calculateXFromRightOffset(savedPosition.rightOffset);
        const targetY = position.y;

        // 🎯 应用智能边界检测
        const adjustedPosition = adjustPositionForBoundaries(targetX, targetY);

        // 更新位置
        setPosition(adjustedPosition);

        // 如果位置被边界限制了，需要更新保存的右侧距离
        const actualRightOffset =
          window.innerWidth - adjustedPosition.x - width;
        if (
          Math.abs(actualRightOffset - savedPosition.rightOffset) > 1 ||
          adjustedPosition.y !== savedPosition.y
        ) {
          setSavedPosition({
            rightOffset: Math.max(16, actualRightOffset),
            y: adjustedPosition.y,
          });
        }
      };

      handleResize(); // Call once on mount
    }, [width, position, savedPosition, setSavedPosition]);

    // Use global resize listener (shared across all components)
    useGlobalResize(() => {
      if (!position) return;

      // 根据当前保存的右侧距离重新计算 x 坐标
      const targetX = calculateXFromRightOffset(savedPosition.rightOffset);
      const targetY = position.y;

      // 🎯 应用智能边界检测
      const adjustedPosition = adjustPositionForBoundaries(targetX, targetY);

      // 更新位置
      setPosition(adjustedPosition);

      // 如果位置被边界限制了，需要更新保存的右侧距离
      const actualRightOffset = window.innerWidth - adjustedPosition.x - width;
      if (
        Math.abs(actualRightOffset - savedPosition.rightOffset) > 1 ||
        adjustedPosition.y !== savedPosition.y
      ) {
        setSavedPosition({
          rightOffset: Math.max(16, actualRightOffset),
          y: adjustedPosition.y,
        });
      }
    }, [width, position, savedPosition]);

    // 监听外部位置重置事件（必须在任何早退 return 之前声明，保持 Hook 顺序一致）
    useEffect(() => {
      const RESET_EVENT = 'xhunt:reset-panel-position';
      const handler = (e: Event) => {
        try {
          const custom = e as CustomEvent<{
            storageKey?: string;
            rightOffset?: number;
            y?: number;
          }>;
          const payload = custom?.detail || {};
          // 仅处理当前 storageKey 的重置请求
          if (payload.storageKey && payload.storageKey !== storageKey) return;
          const nextRightOffset = Math.max(16, payload.rightOffset ?? 16);
          const nextY = payload.y ?? 50;
          // 写入存储
          setSavedPosition({ rightOffset: nextRightOffset, y: nextY });
          // 计算并应用位置
          const targetX = calculateXFromRightOffset(nextRightOffset);
          const adjusted = adjustPositionForBoundaries(targetX, nextY);
          setPosition(adjusted);
        } catch {}
      };
      window.addEventListener(RESET_EVENT, handler as EventListener);
      return () =>
        window.removeEventListener(RESET_EVENT, handler as EventListener);
    }, [storageKey, width, setSavedPosition]);

    // 如果位置还未初始化（存储还在加载），不渲染面板
    if (!position) {
      return null;
    }

    // 🎯 动态计算边界，确保拖拽时不会超出
    const dragBounds = {
      top: 16,
      left: 16,
      right: window.innerWidth - width - 16,
      bottom: window.innerHeight - 100,
    };

    return (
      <Draggable
        nodeRef={nodeRef}
        position={position}
        onDrag={handleDrag}
        onStop={handleDragStop}
        handle={`.${dragHandleClassName}`}
        bounds={dragBounds}
        disabled={disabled}
      >
        <div
          ref={nodeRef}
          className={`${className} fixed`}
          style={{
            visibility: 'visible',
            zIndex: 1000,
            width: `${width}px`,
          }}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          {children}
        </div>
      </Draggable>
    );
  }
);

DraggablePanel.displayName = 'DraggablePanel';
