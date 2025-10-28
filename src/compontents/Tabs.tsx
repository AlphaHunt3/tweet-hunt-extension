import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useGlobalResize } from '~contents/hooks/useGlobalResize';

interface Tab {
  id: string;
  label: string;
  hasRedDot?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  // Check scroll position and update arrow visibility
  const updateArrowVisibility = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    const isOverflowing = scrollWidth > clientWidth;

    setShowLeftArrow(isOverflowing && scrollLeft > 5);
    setShowRightArrow(
      isOverflowing && scrollLeft < scrollWidth - clientWidth - 5
    );
  };

  // Scroll handler
  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = 150;
    const targetScroll =
      direction === 'left'
        ? container.scrollLeft - scrollAmount
        : container.scrollLeft + scrollAmount;

    container.scrollTo({
      left: targetScroll,
      behavior: 'smooth',
    });
  };

  // Smart scroll to center the active tab
  const scrollToTab = (tabId: string) => {
    const container = scrollContainerRef.current;
    const tabElement = tabRefs.current.get(tabId);

    if (!container || !tabElement) return;

    const containerRect = container.getBoundingClientRect();
    const tabRect = tabElement.getBoundingClientRect();

    // Calculate the scroll position to center the tab
    const tabCenter = tabRect.left + tabRect.width / 2;
    const containerCenter = containerRect.left + containerRect.width / 2;
    const scrollOffset = tabCenter - containerCenter;

    container.scrollTo({
      left: container.scrollLeft + scrollOffset,
      behavior: 'smooth',
    });

    // Update arrow visibility after scroll
    setTimeout(() => updateArrowVisibility(), 300);
  };

  // Update arrows on mount and when tabs change
  useEffect(() => {
    updateArrowVisibility();

    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => updateArrowVisibility();
    container.addEventListener('scroll', handleScroll);

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [tabs]);

  // Use global resize listener (shared across all components for better performance)
  useGlobalResize(() => {
    updateArrowVisibility();
  }, [tabs]);

  // Auto scroll to active tab when it changes (with slight delay for DOM update)
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToTab(activeTab);
    }, 50);

    return () => clearTimeout(timer);
  }, [activeTab]);

  return (
    <div className='relative border-b theme-border'>
      {/* Left Arrow */}
      {showLeftArrow && (
        <div className='absolute left-0 top-0 bottom-0 z-10 flex items-center pointer-events-none'>
          <div
            className='h-full w-12 pointer-events-auto'
            style={{
              background:
                'linear-gradient(to right, var(--bg-primary, #fff) 0%, transparent 100%)',
            }}
          >
            <button
              type='button'
              onClick={() => scroll('left')}
              className='h-full w-8 flex items-center justify-center theme-text-secondary hover:theme-text-primary transition-colors'
              aria-label='Scroll left'
            >
              <ChevronLeft className='w-4 h-4' />
            </button>
          </div>
        </div>
      )}

      {/* Scrollable Tabs Container */}
      <div
        ref={scrollContainerRef}
        className='flex overflow-x-auto scrollbar-hide'
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            ref={(el) => {
              if (el) {
                tabRefs.current.set(tab.id, el);
              } else {
                tabRefs.current.delete(tab.id);
              }
            }}
            className={`flex-shrink-0 px-4 py-2.5 text-sm font-medium transition-colors relative whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'theme-text-secondary hover:theme-text-primary'
            }`}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
            {tab.hasRedDot && (
              <div className='absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white shadow-sm'></div>
            )}
          </button>
        ))}
      </div>

      {/* Right Arrow */}
      {showRightArrow && (
        <div className='absolute right-0 top-0 bottom-0 z-10 flex items-center pointer-events-none'>
          <div
            className='h-full w-12 pointer-events-auto'
            style={{
              background:
                'linear-gradient(to left, var(--bg-primary, #fff) 0%, transparent 100%)',
            }}
          >
            <button
              type='button'
              onClick={() => scroll('right')}
              className='h-full w-8 ml-auto flex items-center justify-center theme-text-secondary hover:theme-text-primary transition-colors'
              aria-label='Scroll right'
            >
              <ChevronRight className='w-4 h-4' />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
