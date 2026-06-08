import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDebounceFn } from 'ahooks';
import { useGlobalResize } from '~contents/hooks/useGlobalResize';
import { useGlobalScroll } from '~contents/hooks/useGlobalScroll';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { sanitizeHtml } from '~utils/sanitizeHtml';
import { LoginRequired } from './LoginRequired';

interface StatItemProps {
  label: string | React.ReactNode;
  value: string | number | React.ReactNode;
  hoverContent: React.ReactNode;
  valueClassName?: string;
  valueStyle?: Record<string, string>;
  labelClassName?: string;
  className?: string;
  onHover?: () => Promise<void> | void;
}

// Module-level counter for unique IDs
let instanceCounter = 0;

// Shared state for z-index management
const activeInstances = new Set<string>();
const activeTopOpacityInstances = new Set<string>();

const SHOW_DELAY_MS = 350;
const HIDE_DELAY_MS = 100;
const PANEL_FADE_DURATION_MS = 160;
const VIEWPORT_EDGE_GAP = 10;
const TOP_OPACITY_CONTROL_MIN_TOP = 55;
const TOP_PLACEMENT_MIN_TOP = 5;
const PANEL_MAX_WIDTH = 400;
const PANEL_MAX_HEIGHT = 400;

type HoverPanelPlacement = 'top' | 'bottom';

interface ZIndexDomTargets {
  mainElement: HTMLElement;
  bannerElement: HTMLElement;
  topElement: HTMLElement;
}

let zIndexDomTargetsCache: ZIndexDomTargets | null = null;

const isConnectedElement = (element?: HTMLElement | null) => {
  return !!element?.isConnected;
};

const getZIndexDomTargets = (): ZIndexDomTargets | null => {
  if (
    isConnectedElement(zIndexDomTargetsCache?.mainElement) &&
    isConnectedElement(zIndexDomTargetsCache?.bannerElement) &&
    isConnectedElement(zIndexDomTargetsCache?.topElement)
  ) {
    return zIndexDomTargetsCache;
  }

  const mainElement = document.querySelector('main[role]') as HTMLElement;
  const bannerElement = document.querySelector(
    'header[role="banner"]',
  ) as HTMLElement;
  const primaryColumn = mainElement?.querySelector(
    '[data-testid="primaryColumn"]',
  ) as HTMLElement;
  const firstChild = primaryColumn?.firstElementChild as HTMLElement;
  const topElement = firstChild?.firstElementChild as HTMLElement;

  if (
    !mainElement ||
    !bannerElement ||
    !primaryColumn ||
    !firstChild ||
    !topElement
  ) {
    zIndexDomTargetsCache = null;
    return null;
  }

  zIndexDomTargetsCache = {
    mainElement,
    bannerElement,
    topElement,
  };

  return zIndexDomTargetsCache;
};

const setStyleIfChanged = (
  element: HTMLElement,
  property: keyof CSSStyleDeclaration,
  value: string,
) => {
  if (element.style[property] !== value) {
    // CSSStyleDeclaration 的索引类型比较宽，这里统一按字符串样式属性写入
    (element.style[property] as string) = value;
  }
};

const setAttributeIfChanged = (
  element: HTMLElement,
  name: string,
  value: string,
) => {
  if (element.getAttribute(name) !== value) {
    element.setAttribute(name, value);
  }
};

// Debounced z-index update function
const updateZIndexes = () => {
  const targets = getZIndexDomTargets();
  if (!targets) return;

  const { mainElement, bannerElement, topElement } = targets;

  if (activeInstances.size > 0) {
    setStyleIfChanged(mainElement, 'zIndex', '50');
    setStyleIfChanged(topElement, 'transition', '0.3s ease-in-out');
    if (activeTopOpacityInstances.size > 0) {
      setStyleIfChanged(topElement, 'opacity', '0.1');
      setAttributeIfChanged(topElement, 'data-xhunt-hover-opacity', 'true');
    } else if (topElement.getAttribute('data-xhunt-hover-opacity') === 'true') {
      setStyleIfChanged(topElement, 'opacity', '1');
      topElement.removeAttribute('data-xhunt-hover-opacity');
    }
    setStyleIfChanged(topElement, 'pointerEvents', 'none');
    setAttributeIfChanged(topElement, 'data-xhunt-exclude', 'true');
    setStyleIfChanged(bannerElement, 'zIndex', '1');
  } else {
    setStyleIfChanged(mainElement, 'zIndex', '0');
    setStyleIfChanged(topElement, 'transition', '0.3s ease-in-out');
    if (topElement.getAttribute('data-xhunt-hover-opacity') === 'true') {
      setStyleIfChanged(topElement, 'opacity', '1');
      topElement.removeAttribute('data-xhunt-hover-opacity');
    }
    setStyleIfChanged(topElement, 'pointerEvents', 'auto');
    setAttributeIfChanged(topElement, 'data-xhunt-exclude', 'true');
    setStyleIfChanged(bannerElement, 'zIndex', '3');
  }
};

export function HoverStatItem({
  label,
  value,
  hoverContent,
  valueClassName = '',
  valueStyle = {},
  labelClassName = '',
  className = '',
  onHover,
}: StatItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPanelMounted, setIsPanelMounted] = useState(false);
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>();
  const showTimer = useRef<ReturnType<typeof setTimeout>>();
  const panelUnmountTimer = useRef<ReturnType<typeof setTimeout>>();
  const panelOpenFrame = useRef<number>();
  const isOpeningPanelRef = useRef(false);
  const hasAutoScrolledDownRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const idRef = useRef<string>(`hover-stat-item-${instanceCounter++}`);
  const hasCalledHover = useRef(false);
  const isLoadingRef = useRef(false);
  const isPointerInsideRef = useRef(false);
  const lastPointerPositionRef = useRef<{ x: number; y: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelContentRef = useRef<HTMLDivElement>(null);
  const [panelPosition, setPanelPosition] = useState<{
    left: number;
    placement: HoverPanelPlacement;
    maxHeight: number;
    maxWidth: number;
  }>({
    left: 0,
    placement: 'top',
    maxHeight: PANEL_MAX_HEIGHT,
    maxWidth: PANEL_MAX_WIDTH,
  });

  const clearShowTimer = () => {
    clearTimeout(showTimer.current);
    showTimer.current = undefined;
  };

  const clearHideTimer = () => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = undefined;
  };

  const clearPanelUnmountTimer = () => {
    clearTimeout(panelUnmountTimer.current);
    panelUnmountTimer.current = undefined;
  };

  const clearPanelOpenFrame = () => {
    if (panelOpenFrame.current !== undefined) {
      window.cancelAnimationFrame(panelOpenFrame.current);
      panelOpenFrame.current = undefined;
    }
  };

  const openHoverPanel = () => {
    clearPanelUnmountTimer();
    clearPanelOpenFrame();
    isOpeningPanelRef.current = true;
    hasAutoScrolledDownRef.current = false;
    setIsPanelMounted(true);
  };

  const closeHoverPanel = () => {
    isOpeningPanelRef.current = false;
    hasAutoScrolledDownRef.current = false;
    clearPanelOpenFrame();
    setIsHovered(false);
    clearPanelUnmountTimer();
    panelUnmountTimer.current = setTimeout(() => {
      panelUnmountTimer.current = undefined;
      setIsPanelMounted(false);
    }, PANEL_FADE_DURATION_MS);
  };

  const updatePointerPosition = (event: {
    clientX: number;
    clientY: number;
  }) => {
    lastPointerPositionRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
  };

  const isPointerActuallyInside = () => {
    const container = containerRef.current;
    if (!container) return false;

    if (container.matches(':hover')) {
      return true;
    }

    const pointerPosition = lastPointerPositionRef.current;
    if (!pointerPosition) return false;

    const elementUnderPointer = document.elementFromPoint(
      pointerPosition.x,
      pointerPosition.y,
    );

    return !!(elementUnderPointer && container.contains(elementUnderPointer));
  };

  const updatePanelPosition = useCallback(() => {
    const panel = panelRef.current;
    const panelContent = panelContentRef.current;
    const container = containerRef.current;
    if (!panel || !container) return;

    const viewportWidth =
      window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight;
    const triggerRect = container.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const panelContentRect = panelContent?.getBoundingClientRect();
    const maxWidth = Math.max(
      0,
      Math.min(PANEL_MAX_WIDTH, viewportWidth - VIEWPORT_EDGE_GAP * 2),
    );

    const panelGap = 8;
    const panelHeight = Math.min(
      panelContent?.scrollHeight ||
      panelContentRect?.height ||
      panelRect.height ||
      PANEL_MAX_HEIGHT,
      PANEL_MAX_HEIGHT,
    );
    const availableTop = Math.max(
      0,
      triggerRect.top - VIEWPORT_EDGE_GAP - panelGap,
    );
    const availableBottom = Math.max(
      0,
      viewportHeight - triggerRect.bottom - VIEWPORT_EDGE_GAP - panelGap,
    );
    // 预估面板向上展示时，面板顶部相对浏览器视口的距离；
    // 如果这个 top 太小，说明浮层离屏幕顶部太近，直接改为向下展示。
    const estimatedTopPlacementPanelTop =
      triggerRect.top - panelHeight - panelGap;
    const isTopPlacementTooCloseToViewportTop =
      estimatedTopPlacementPanelTop < TOP_PLACEMENT_MIN_TOP;
    const placement: HoverPanelPlacement =
      !isTopPlacementTooCloseToViewportTop &&
        (availableTop >= Math.min(panelHeight, PANEL_MAX_HEIGHT) ||
          availableTop >= availableBottom)
        ? 'top'
        : 'bottom';

    if (placement === 'bottom' && !hasAutoScrolledDownRef.current) {
      const scrollingElement =
        document.scrollingElement || document.documentElement || document.body;
      const currentScrollTop =
        scrollingElement?.scrollTop ?? window.scrollY ?? 0;

      if (currentScrollTop <= 0) {
        hasAutoScrolledDownRef.current = true;
        window.scrollBy({
          top: 200,
          behavior: 'smooth',
        });
      }
    }

    const estimatedPanelTop =
      placement === 'top'
        ? estimatedTopPlacementPanelTop
        : triggerRect.bottom + panelGap;
    if (estimatedPanelTop < TOP_OPACITY_CONTROL_MIN_TOP) {
      activeTopOpacityInstances.add(idRef.current);
    } else {
      activeTopOpacityInstances.delete(idRef.current);
    }
    updateZIndexes();

    const availableHeight =
      placement === 'top' ? availableTop : availableBottom;
    const maxHeight = Math.max(80, Math.min(PANEL_MAX_HEIGHT, availableHeight));

    const panelWidth = Math.min(panelRect.width || PANEL_MAX_WIDTH, maxWidth);
    const baseLeft = triggerRect.left + triggerRect.width / 2 - panelWidth / 2;
    const minLeft = VIEWPORT_EDGE_GAP;
    const maxLeft = Math.max(
      VIEWPORT_EDGE_GAP,
      viewportWidth - VIEWPORT_EDGE_GAP - panelWidth,
    );
    const targetLeft = Math.min(Math.max(baseLeft, minLeft), maxLeft);
    const devicePixelRatio = window.devicePixelRatio || 1;
    const snappedTargetLeft =
      Math.round(targetLeft * devicePixelRatio) / devicePixelRatio;
    const left = snappedTargetLeft - triggerRect.left;

    setPanelPosition((prev) => {
      const next = { left, placement, maxHeight, maxWidth };
      if (
        Math.abs(prev.left - next.left) < 0.5 &&
        prev.placement === next.placement &&
        Math.abs(prev.maxHeight - next.maxHeight) < 0.5 &&
        Math.abs(prev.maxWidth - next.maxWidth) < 0.5
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  const scheduleClose = () => {
    clearHideTimer();
    hoverTimer.current = setTimeout(() => {
      hoverTimer.current = undefined;
      if (isPointerActuallyInside()) {
        isPointerInsideRef.current = true;
        return;
      }
      closeHoverPanel();
    }, HIDE_DELAY_MS);
  };

  const { run: debouncedHover } = useDebounceFn(
    async () => {
      if (!hasCalledHover.current && onHover) {
        hasCalledHover.current = true;
        isLoadingRef.current = true;
        await onHover();
        isLoadingRef.current = false;
      }
    },
    {
      wait: 300,
      leading: true,
      trailing: false,
    },
  );

  useEffect(() => {
    if (isHovered) {
      window.dispatchEvent(
        new CustomEvent('hover-stat-item-opened', { detail: idRef.current }),
      );
    } else if (!isLoadingRef.current) {
      hasCalledHover.current = false;
    }
  }, [isHovered]);

  useEffect(() => {
    const handleOtherHover = (e: any) => {
      const openedId = e.detail;
      if (openedId !== idRef.current) {
        closeHoverPanel();
        if (!isLoadingRef.current) {
          hasCalledHover.current = false;
        }
      }
    };

    window.addEventListener('hover-stat-item-opened', handleOtherHover);

    return () => {
      window.removeEventListener('hover-stat-item-opened', handleOtherHover);
    };
  }, []);

  useEffect(() => {
    if (isPanelMounted) {
      activeInstances.add(idRef.current);
    } else {
      activeInstances.delete(idRef.current);
      activeTopOpacityInstances.delete(idRef.current);
    }
    updateZIndexes();

    return () => {
      if (isPanelMounted) {
        activeInstances.delete(idRef.current);
        activeTopOpacityInstances.delete(idRef.current);
        updateZIndexes();
      }
    };
  }, [isPanelMounted]);

  useEffect(() => {
    return () => {
      activeInstances.delete(idRef.current);
      activeTopOpacityInstances.delete(idRef.current);
      updateZIndexes();
      clearShowTimer();
      clearHideTimer();
      isOpeningPanelRef.current = false;
      hasAutoScrolledDownRef.current = false;
      clearPanelUnmountTimer();
      clearPanelOpenFrame();
    };
  }, []);

  useEffect(() => {
    if (!isHovered) return;

    const rafId = window.requestAnimationFrame(updatePanelPosition);
    return () => window.cancelAnimationFrame(rafId);
  }, [hoverContent, isHovered, updatePanelPosition]);

  useEffect(() => {
    if (!isPanelMounted || isHovered || !isOpeningPanelRef.current) return;

    panelOpenFrame.current = window.requestAnimationFrame(() => {
      updatePanelPosition();
      panelOpenFrame.current = window.requestAnimationFrame(() => {
        panelOpenFrame.current = undefined;
        isOpeningPanelRef.current = false;
        setIsHovered(true);
      });
    });

    return () => {
      clearPanelOpenFrame();
    };
  }, [isPanelMounted, isHovered, updatePanelPosition]);

  useGlobalScroll(() => {
    if (isHovered) {
      updatePanelPosition();
    }
  }, [isHovered, updatePanelPosition]);

  useGlobalResize(() => {
    if (isHovered) {
      updatePanelPosition();
    }
  }, [isHovered, updatePanelPosition]);

  useEffect(() => {
    if (!isHovered) return;

    const handlePointerMove = (event: PointerEvent) => {
      updatePointerPosition(event);

      const container = containerRef.current;
      if (!container) return;

      if (container.contains(event.target as Node)) {
        clearHideTimer();
        return;
      }

      scheduleClose();
    };

    document.addEventListener('pointermove', handlePointerMove, true);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove, true);
    };
  }, [isHovered]);

  const handleMouseEnter = (event?: React.MouseEvent) => {
    if (event) {
      updatePointerPosition(event);
    }
    isPointerInsideRef.current = true;
    clearHideTimer();

    if (!isHovered && isPanelMounted) {
      openHoverPanel();
      return;
    }

    if (isHovered || showTimer.current) return;

    showTimer.current = setTimeout(() => {
      showTimer.current = undefined;
      if (!isPointerInsideRef.current) return;

      openHoverPanel();
      if (onHover) {
        debouncedHover();
      }
    }, SHOW_DELAY_MS);
  };

  const handleMouseLeave = (
    relatedTarget?: EventTarget | null,
    event?: React.MouseEvent,
  ) => {
    if (event) {
      updatePointerPosition(event);
    }

    const container = containerRef.current;
    if (relatedTarget instanceof Node && container?.contains(relatedTarget)) {
      return;
    }

    isPointerInsideRef.current = false;
    clearShowTimer();
    scheduleClose();
  };

  return (
    <div
      ref={containerRef}
      data-theme={theme}
      data-xhunt-exclude='true'
      className={`relative mr-4 ${className}`}
      style={{
        width: 'max-content',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseMove={(event) => {
        updatePointerPosition(event);
        requestIdleCallback(() => {
          if (isHovered) return;
          if (!containerRef.current?.matches(':hover')) return;
          handleMouseEnter();
        });
      }}
      onMouseLeave={(event) => handleMouseLeave(event.relatedTarget, event)}
    >
      <div
        className='flex items-center gap-1 cursor-pointer rounded px-1 -mx-1 theme-hover transition-colors'
        style={{
          backgroundColor: isPanelMounted ? 'var(--hover-bg)' : undefined,
        }}
      >
        {typeof label === 'string' ? (
          <span
            className={`text-sm theme-text-primary ${labelClassName}`}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(label) }}
          />
        ) : (
          <span className={`text-sm theme-text-primary ${labelClassName}`}>
            {label}
          </span>
        )}
        {typeof value === 'string' ? (
          <span
            className={`text-sm ${valueClassName}`}
            style={valueStyle}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(value || '') }}
          />
        ) : (
          <span className={`text-sm ${valueClassName}`}>
            {value != null ? value : ''}
          </span>
        )}
      </div>

      {isPanelMounted && (
        <div
          ref={panelRef}
          data-theme={theme}
          className={`absolute w-max max-w-[400px] z-50 ${isHovered ? 'pointer-events-auto' : 'pointer-events-none'
            } ${panelPosition.placement === 'top' ? 'bottom-full' : 'top-full'}`}
          style={{
            left: panelPosition.left,
            maxWidth: panelPosition.maxWidth,
          }}
          onMouseEnter={(event) => {
            updatePointerPosition(event);
            isPointerInsideRef.current = true;
            clearHideTimer();
          }}
          onMouseMove={updatePointerPosition}
          onMouseLeave={(event) => handleMouseLeave(event.relatedTarget, event)}
          onPointerDown={(event) => {
            updatePointerPosition(event);
            isPointerInsideRef.current = true;
            clearHideTimer();
          }}
        >
          <div
            ref={panelContentRef}
            className={`z-10 theme-bg-secondary theme-text-primary rounded-lg shadow-lg theme-border border p-1 overflow-auto custom-scrollbar transition-opacity duration-150 ease-out ${isHovered
              ? 'opacity-100'
              : 'opacity-0 pointer-events-none'
              }`}
            style={{
              marginTop: panelPosition.placement === 'bottom' ? 8 : undefined,
              marginBottom: panelPosition.placement === 'top' ? 8 : undefined,
              maxHeight: panelPosition.maxHeight,
              maxWidth: panelPosition.maxWidth,
            }}
          >
            <LoginRequired>{hoverContent}</LoginRequired>
          </div>
        </div>
      )}
    </div>
  );
}
