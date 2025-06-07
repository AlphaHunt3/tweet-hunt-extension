import { useEffect, useRef, useState } from 'react';
import TokenAnalysisPanel from '~/compontents/TokenAnalysisPanel.tsx';
import { useDebounceFn, useLatest, useRequest } from 'ahooks';
import { fetchTokenAnalysisInfo } from '~contents/services/api.ts';
import { TOKEN_HOVER_EVENT, TokenHoverDetail } from '~contents/hooks/useHighlightTokens';
import { FloatingContainer, FloatingContainerRef } from '~/compontents/FloatingContainer';

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
    }, 3000);
  };

  const { data, run: fetchData, loading: loadingData } = useRequest(
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

  const { run: handleHoverEvent } = useDebounceFn((event: CustomEvent<TokenHoverDetail>) => {
    const detail = event.detail;
    if (detail && detail.ticker && detail.element) {
      clearCloseTimer();
      targetRef.current = detail.element;
      setHoveringTicker(detail.ticker);
      containerRef.current?.show();
      latestShowTimeRef.current = Date.now();
      if (detail.ticker !== hoveringTickerRef.current) {
        fetchData(detail.ticker);
      }
    } else {
      if (Date.now() - latestShowTimeRef.current > 1000) {
        startCloseTimer();
      }
    }
  }, {
    wait: 500,
    maxWait: 500,
    leading: false,
    trailing: true,
  });

  useEffect(() => {
    window.addEventListener(TOKEN_HOVER_EVENT, handleHoverEvent as EventListener);
    return () => {
      window.removeEventListener(TOKEN_HOVER_EVENT, handleHoverEvent as EventListener);
      clearCloseTimer();
    };
  }, [handleHoverEvent]);

  const handlePanelMouseEnter = () => {
    requestIdleCallback(() => {
      clearCloseTimer();
      containerRef.current?.show();
    });
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
      maxWidth="480px"
      maxHeight="460px"
      mask={false}
    >
      {hoveringTicker && <TokenAnalysisPanel
				token={hoveringTicker}
				data={data}
				isLoading={loadingData}
				setIsVisible={(visible) => {
          if (visible) {
            containerRef.current?.show();
          } else {
            containerRef.current?.hide();
          }
        }}
				onMouseEnter={handlePanelMouseEnter}
				onMouseLeave={handlePanelMouseLeave}
				onMouseOver={handlePanelMouseEnter}
			/>}
    </FloatingContainer>
  );
}
