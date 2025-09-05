import { useEffect, useRef, useState } from 'react';
import TokenAnalysisPanel from '~/compontents/TokenAnalysisPanel.tsx';
import { useDebounceFn, useLatest, useRequest } from 'ahooks';
import { fetchTokenAnalysisInfo } from '~contents/services/api.ts';
import {
  TOKEN_HOVER_EVENT,
  TokenHoverDetail,
} from '~contents/hooks/useHighlightTokens';
import {
  FloatingContainer,
  FloatingContainerRef,
} from '~/compontents/FloatingContainer';

export function TickerTips() {
  const [hoveringTicker, setHoveringTicker] = useState<string | null>(null);
  const hoveringTickerRef = useLatest(hoveringTicker);
  const targetRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<FloatingContainerRef>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const latestShowTimeRef = useRef(0);
  const closeTimerRef = useRef<number | null>(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const startCloseTimer = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      containerRef.current?.hide();
      setHoveringTicker(null);
    }, 500);
  };

  const {
    data,
    run: fetchData,
    loading: loadingData,
  } = useRequest(
    (ticker: string) => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }

      const controller = new AbortController();
      controllerRef.current = controller;

      return fetchTokenAnalysisInfo(ticker, controller.signal);
    },
    {
      manual: true,
      debounceWait: 50,
      debounceMaxWait: 50,
      debounceLeading: true,
      debounceTrailing: false,
    }
  );

  const { run: handleHoverEvent } = useDebounceFn(
    (event: CustomEvent<TokenHoverDetail>) => {
      const detail = event.detail;
      if (detail && detail.ticker && detail.element) {
        clearCloseTimer();
        targetRef.current = detail.element;
        setHoveringTicker(detail.ticker);
        latestShowTimeRef.current = Date.now();
        if (detail.ticker !== hoveringTickerRef.current) {
          fetchData(detail.ticker);
        }
      } else {
        if (Date.now() - latestShowTimeRef.current > 1000) {
          startCloseTimer();
        }
      }
    },
    {
      wait: 500,
      maxWait: 500,
      leading: false,
      trailing: true,
    }
  );

  // 监听 hoveringTicker 变化，确保状态更新后再显示
  useEffect(() => {
    if (hoveringTicker && targetRef.current) {
      containerRef.current?.show();
    }
  }, [hoveringTicker]);

  useEffect(() => {
    window.addEventListener(
      TOKEN_HOVER_EVENT,
      handleHoverEvent as EventListener
    );
    return () => {
      window.removeEventListener(
        TOKEN_HOVER_EVENT,
        handleHoverEvent as EventListener
      );
      clearCloseTimer();
    };
  }, [handleHoverEvent]);

  const handlePanelMouseEnter = () => {
    clearCloseTimer();
    // 如果已经有 ticker 数据，直接显示
    if (hoveringTicker && targetRef.current) {
      containerRef.current?.show();
    }
  };

  const handlePanelMouseLeave = () => {
    startCloseTimer();
  };

  // if (!hoveringTicker) return null;

  return (
    <FloatingContainer
      ref={containerRef}
      targetRef={targetRef}
      offsetX={-100}
      offsetY={10}
      maxWidth='480px'
      maxHeight='460px'
      mask={false}
    >
      {hoveringTicker && (
        <TokenAnalysisPanel
          token={hoveringTicker}
          data={data}
          isLoading={loadingData}
          setIsVisible={(visible) => {
            if (visible) {
              containerRef.current?.show();
            } else {
              containerRef.current?.hide();
              setHoveringTicker(null);
            }
          }}
          onMouseEnter={handlePanelMouseEnter}
          onMouseLeave={handlePanelMouseLeave}
          onMouseOver={handlePanelMouseEnter}
        />
      )}
    </FloatingContainer>
  );
}
