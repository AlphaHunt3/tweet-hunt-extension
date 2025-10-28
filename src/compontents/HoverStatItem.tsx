import React, { useEffect, useRef, useState } from 'react';
import { useDebounceFn } from 'ahooks';
import { useLocalStorage } from '~storage/useLocalStorage.ts';

interface StatItemProps {
  label: string;
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

// Debounced z-index update function
const updateZIndexes = () => {
  const mainElement = document.querySelector('main[role]') as HTMLElement;
  const bannerElement = document.querySelector(
    'header[role="banner"]'
  ) as HTMLElement;
  const primaryColumn = mainElement?.querySelector(
    '[data-testid="primaryColumn"]'
  ) as HTMLElement;
  const firstChild = primaryColumn?.firstElementChild as HTMLElement;
  const TopElement = firstChild?.firstElementChild as HTMLElement;

  if (
    !mainElement ||
    !bannerElement ||
    !primaryColumn ||
    !firstChild ||
    !TopElement
  )
    return;

  if (activeInstances.size > 0) {
    mainElement.style.zIndex = '50';
    TopElement.style.transition = '0.3s ease-in-out';
    TopElement.style.opacity = '0.1';
    TopElement.style.pointerEvents = 'none';
    TopElement.setAttribute('data-xhunt-exclude', 'true');
    bannerElement.style.zIndex = '1';
  } else {
    mainElement.style.zIndex = '0';
    TopElement.style.transition = '0.3s ease-in-out';
    TopElement.style.opacity = '1';
    TopElement.style.pointerEvents = 'auto';
    TopElement.setAttribute('data-xhunt-exclude', 'true');
    bannerElement.style.zIndex = '3';
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
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);
  const idRef = useRef<string>(`hover-stat-item-${instanceCounter++}`);
  const hasCalledHover = useRef(false);
  const isLoadingRef = useRef(false);

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
    }
  );

  useEffect(() => {
    if (isHovered) {
      window.dispatchEvent(
        new CustomEvent('hover-stat-item-opened', { detail: idRef.current })
      );
    } else if (!isLoadingRef.current) {
      hasCalledHover.current = false;
    }
  }, [isHovered]);

  useEffect(() => {
    const handleOtherHover = (e: any) => {
      const openedId = e.detail;
      if (openedId !== idRef.current) {
        setIsHovered(false);
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
    if (isHovered) {
      activeInstances.add(idRef.current);
    } else {
      activeInstances.delete(idRef.current);
    }
    updateZIndexes();

    return () => {
      if (isHovered) {
        activeInstances.delete(idRef.current);
        updateZIndexes();
      }
    };
  }, [isHovered]);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (onHover) {
      debouncedHover();
    }
  };

  return (
    <div
      ref={containerRef}
      data-theme={theme}
      className={`relative mr-4 ${className}`}
      style={{
        width: 'max-content',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseMove={() => {
        requestIdleCallback(() => {
          if (isHovered) return;
          handleMouseEnter();
        });
      }}
      onMouseLeave={() => {
        if (isLoadingRef.current) return;
        hoverTimer.current = setTimeout(() => {
          setIsHovered(false);
        }, 100);
      }}
    >
      <div className='flex items-center gap-1 cursor-pointer'>
        <span
          className={`text-sm theme-text-primary ${labelClassName}`}
          dangerouslySetInnerHTML={{ __html: label }}
        />
        {typeof value === 'string' ? (
          <span
            className={`text-sm ${valueClassName}`}
            style={valueStyle}
            dangerouslySetInnerHTML={{ __html: value || '' }}
          />
        ) : (
          <span className={`text-sm ${valueClassName}`}>
            {value != null ? value : ''}
          </span>
        )}
      </div>

      {isHovered && (
        <div
          data-theme={theme}
          className='absolute bottom-full left-1/2 -translate-x-1/2 w-max max-w-[400px] z-50'
          onMouseEnter={() => {
            clearTimeout(hoverTimer.current);
            setIsHovered(true);
          }}
          onMouseLeave={() => {
            if (isLoadingRef.current) return;
            hoverTimer.current = setTimeout(() => {
              setIsHovered(false);
            }, 100);
          }}
        >
          <div className='z-10 theme-bg-secondary theme-text-primary rounded-lg shadow-lg theme-border border p-1 -translate-y-2 max-h-[400px] overflow-y-auto custom-scrollbar'>
            {hoverContent}
          </div>
          <div
            className='inline-block absolute left-1/2 -translate-x-1/2 -bottom-[11px] w-0 h-0'
            style={{
              border: '10px solid transparent',
              borderTopColor: 'var(--bg-secondary)',
            }}
          ></div>
        </div>
      )}
    </div>
  );
}
