import { useEffect, useRef, useState } from 'react';
import TokenAnalysisPanel from '~/compontents/TokenAnalysisPanel.tsx';
import { TradingPanel } from '~/compontents/TradingPanel';
import { TokenSelector } from '~/compontents/TokenSelector';
import { useDebounceFn, useLatest, useRequest } from 'ahooks';
import {
  fetchTokenAnalysisInfo,
  fetchTokenSearch,
} from '~contents/services/api.ts';
import {
  TOKEN_HOVER_EVENT,
  TokenHoverDetail,
} from '~contents/hooks/useHighlightTokens';
import {
  FloatingContainer,
  FloatingContainerRef,
} from '~/compontents/FloatingContainer';
import { TokenSearchData } from '~types';

export function TickerTips() {
  const [hoveringTicker, setHoveringTicker] = useState<string | null>(null);
  const hoveringTickerRef = useLatest(hoveringTicker);
  const targetRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<FloatingContainerRef>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const latestShowTimeRef = useRef(0);
  const closeTimerRef = useRef<number | null>(null);

  // 新增状态
  const [showTradingPanel, setShowTradingPanel] = useState(false);
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  const [tokenSearchData, setTokenSearchData] =
    useState<TokenSearchData | null>(null);
  const [tradingPanelFromSelector, setTradingPanelFromSelector] =
    useState(false);
  const tradingPanelFromSelectorRef = useLatest(tradingPanelFromSelector);

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
      setShowTradingPanel(false);
      setShowTokenSelector(false);
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

  // 代币搜索请求
  const {
    data: searchData,
    run: fetchSearchData,
    loading: loadingSearch,
  } = useRequest(
    (ticker: string) => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }

      const controller = new AbortController();
      controllerRef.current = controller;

      // 移除$符号进行搜索
      const cleanTicker = ticker.replace(/\$/g, '');
      return fetchTokenSearch(cleanTicker, controller.signal);
    },
    {
      manual: true,
      debounceWait: 300,
      debounceMaxWait: 500,
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
          fetchSearchData(detail.ticker); // 同时搜索代币信息
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
      // containerRef.current?.attachToAnchor();
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

  // 处理Trade按钮点击
  const handleTradeClick = () => {
    if (searchData?.data && searchData.data.length > 0) {
      clearCloseTimer(); // 清空定时器
      // 如果只有一个结果，直接进入交易面板
      if (searchData.data.length === 1) {
        setTokenSearchData(searchData.data[0]);
        setShowTradingPanel(true);
        setTradingPanelFromSelector(false); // 来自分析页
        // containerRef.current?.detachFromAnchor(); // 脱离锚点
      } else {
        // 多个结果，显示选择器
        setShowTokenSelector(true);
        // containerRef.current?.detachFromAnchor(); // 脱离锚点
      }
    }
  };

  // 处理代币选择
  const handleTokenSelect = (token: TokenSearchData) => {
    clearCloseTimer(); // 清空定时器
    setTokenSearchData(token);
    setShowTokenSelector(false);
    setShowTradingPanel(true);
    setTradingPanelFromSelector(true); // 来自选择器
  };

  // 处理返回按钮
  const handleBackToAnalysis = () => {
    if (tradingPanelFromSelectorRef.current) {
      // 如果来自选择器，返回到选择器（保持脱离状态）
      setShowTradingPanel(false);
      setShowTokenSelector(true);
      setTradingPanelFromSelector(false);
    } else {
      // 如果来自分析页，返回到分析页
      setShowTradingPanel(false);
      setShowTokenSelector(false);
      setTokenSearchData(null);
      setTradingPanelFromSelector(false);
      // containerRef.current?.attachToAnchor(); // 重新锚定
    }
  };

  // 处理从选择器返回
  const handleBackFromSelector = () => {
    setShowTokenSelector(false);
    // containerRef.current?.attachToAnchor(); // 重新锚定
  };

  // if (!hoveringTicker) return null;

  return (
    <FloatingContainer
      ref={containerRef}
      targetRef={targetRef}
      offsetX={-100}
      offsetY={10}
      maxWidth='800px'
      maxHeight='1000px'
      mask={false}
    >
      {hoveringTicker && (
        <>
          {showTradingPanel && tokenSearchData ? (
            <TradingPanel
              tokenData={tokenSearchData}
              onBack={handleBackToAnalysis}
              onClose={() => {
                // containerRef.current?.attachToAnchor(); // 重新锚定
                containerRef.current?.hide();
                setHoveringTicker(null);
                setShowTokenSelector(false);
                setShowTradingPanel(false);
                setTokenSearchData(null);
                setTradingPanelFromSelector(false);
              }}
              fromTokenSelector={tradingPanelFromSelector}
            />
          ) : showTokenSelector && searchData?.data ? (
            <TokenSelector
              searchResults={searchData.data}
              onSelectToken={handleTokenSelect}
              onBack={handleBackFromSelector}
              onClose={() => {
                // containerRef.current?.attachToAnchor(); // 重新锚定
                containerRef.current?.hide();
                setHoveringTicker(null);
                setShowTokenSelector(false);
                setShowTradingPanel(false);
                setTokenSearchData(null);
                setTradingPanelFromSelector(false);
              }}
            />
          ) : (
            <TokenAnalysisPanel
              token={hoveringTicker}
              data={data}
              isLoading={loadingData}
              searchData={searchData}
              isLoadingSearch={loadingSearch}
              onTradeClick={handleTradeClick}
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
        </>
      )}
    </FloatingContainer>
  );
}
