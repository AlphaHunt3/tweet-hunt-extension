import { useStableHover } from './useStableHover';
import { useState, useEffect, useRef } from 'react';
import { useLatest } from 'ahooks';

export function useWeb3TickerFromHover(delay = 800) {
  const { textContent, rect } = useStableHover(delay);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [hoveringTicker, setHoveringTicker] = useState<string>('');
  const hoveringTickerRef = useLatest(hoveringTicker);
  const activeTickerRef = useRef<string>('');
  const [lastValidRect, setLastValidRect] = useState<DOMRect | undefined>();
  const isMouseOverPanelRef = useRef(false);
  const cleanupTimeoutRef = useRef<number | null>(null);
  useEffect(() => {
    if (isMouseOverPanelRef.current) return;
    const ticker = extractTickerOrCA(textContent);

    setHoveringTicker(ticker);
    rect && setLastValidRect(rect);
    if (ticker) {
      activeTickerRef.current = ticker;
      setIsVisible(true);
    } else {
      scheduleHide(true);
    }
  }, [textContent, rect]);

  useEffect(() => {
    if (!isVisible) {
      setHoveringTicker('');
    }
  }, [isVisible]);

  // 延迟关闭逻辑（800ms 后强制判断是否仍在 hover）
  const scheduleHide = (now: boolean = false) => {
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
    }

    cleanupTimeoutRef.current = window.setTimeout(() => {
      if (!isMouseOverPanelRef.current && !hoveringTickerRef.current) {
        activeTickerRef.current = '';
        setIsVisible(false);
      }
    }, now ? 0 : 1000);
  };

  // 暴露面板 hover 状态控制
  const setMouseOverPanel = (value: boolean) => {
    isMouseOverPanelRef.current = value;
    if (!value && !hoveringTickerRef.current) {
      scheduleHide();
    }
  };

  return {
    isVisible,
    lastValidRect,
    setMouseOverPanel,
    hoveringTicker,
    setIsVisible
  };
}
/** 匹配文本中的ticker或者CA **/
function extractTickerOrCA(text: string): string {
  if (!text) return '';

  // 匹配 $ticker
  const tickerMatch = text.match(/\$(?=[a-zA-Z0-9_]*[a-zA-Z])[a-zA-Z0-9_]+\b/);
  if (tickerMatch) return tickerMatch[0];

  // 匹配 Ethereum 地址：0x + 40位hex
  const ethMatch = text.match(/^0x[a-fA-F0-9]{40}$/);
  if (ethMatch) return ethMatch[0];

  // 匹配 Solana 地址：43~44位 Base58 字符
  const solMatch = text.match(/^[1-9A-HJ-NP-Za-km-z]{43,44}$/);
  if (solMatch) return solMatch[0];

  // 匹配 Bitcoin 地址：
  // - Base58: 1或3开头，长度25~34
  // - Bech32: bc1开头
  const btcMatch = text.match(
    /^([13][a-km-zA-HJ-NP-Z0-9]{25,34}|bc1[ac-hdefgprsqstuvwxyz023456789]{6,62})$/i
  );
  if (btcMatch) return btcMatch[0];

  return '';
}
