import React, { useCallback, useMemo, useState } from 'react';
import {
  hierarchy,
  treemap as createTreemap,
  treemapSquarify,
  type HierarchyRectangularNode,
} from 'd3-hierarchy';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { navigateInX } from '~contents/utils/navigateInX';
import { HotToken } from './types';

// ==================== 颜色系统：基于涨跌幅生成红绿色系 ====================

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

const getTokenTone = (pricePct24H: number, mode: 'dark' | 'light' = 'dark') => {
  const positive = pricePct24H >= 0;
  const intensity = Math.min(Math.abs(pricePct24H) * 5, 1);

  if (mode === 'light') {
    if (positive) {
      return {
        hue: 142,
        from: `hsl(158, 62%, ${clamp(62 - intensity * 5, 54, 64)}%)`,
        via: `hsl(164, 56%, ${clamp(46 - intensity * 4, 39, 48)}%)`,
        to: `hsl(170, 46%, ${clamp(31 - intensity * 3, 27, 33)}%)`,
        accent: '#0d9488',
        soft: 'rgba(20, 184, 166, 0.24)',
        text: '#d1fae5',
        priceText: '#fde68a',
      };
    }

    return {
      hue: 350,
      from: `hsl(8, 70%, ${clamp(64 - intensity * 5, 57, 66)}%)`,
      via: `hsl(348, 56%, ${clamp(50 - intensity * 4, 44, 52)}%)`,
      to: `hsl(340, 42%, ${clamp(36 - intensity * 3, 32, 38)}%)`,
      accent: '#f43f5e',
      soft: 'rgba(251, 113, 133, 0.24)',
      text: '#fff1f2',
      priceText: '#fde68a',
    };
  }

  if (positive) {
    return {
      hue: 142,
      from: `hsl(142, 72%, ${clamp(30 - intensity * 8, 20, 34)}%)`,
      via: `hsl(158, 68%, ${clamp(22 - intensity * 5, 14, 26)}%)`,
      to: '#04100a',
      accent: '#22c55e',
      soft: 'rgba(34, 197, 94, 0.22)',
      text: '#4ade80',
      priceText: '#fbbf24',
    };
  }

  return {
    hue: 0,
    from: `hsl(0, 72%, ${clamp(32 - intensity * 8, 20, 36)}%)`,
    via: `hsl(350, 68%, ${clamp(23 - intensity * 5, 14, 28)}%)`,
    to: '#120407',
    accent: '#ef4444',
    soft: 'rgba(239, 68, 68, 0.22)',
    text: '#fb7185',
    priceText: '#fbbf24',
  };
};

// ==================== 工具函数 ====================

type PriceDisplayMode = 'full' | 'whole' | 'compact';

const formatPrice = (
  price: number | undefined,
  mode: PriceDisplayMode = 'full',
): string => {
  if (price === undefined || price === null || price < 0.1) return '';

  if (mode === 'compact') {
    if (price >= 1000000) {
      const value = price / 1000000;
      return `$${value >= 10 ? value.toFixed(0) : value.toFixed(1)}M`;
    }
    if (price >= 1000) {
      const value = price / 1000;
      return `$${value >= 10 ? value.toFixed(0) : value.toFixed(1)}K`;
    }
    return `$${Math.round(price)}`;
  }

  const fixedPrice =
    mode === 'whole' ? Math.round(price).toString() : price.toFixed(2);
  return `$${fixedPrice.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
};

const formatPct = (pricePct24H: number, omitDecimals = false): string => {
  const pct = pricePct24H * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${omitDecimals ? pct.toFixed(0) : pct.toFixed(1)}%`;
};

const truncateSymbol = (symbol: string): string => {
  return symbol.length > 6 ? symbol.substring(0, 6) : symbol;
};

const getRankingStyle = (index: number) => {
  switch (index) {
    case 0:
      return {
        strokeColor: 'rgba(250, 204, 21, 0.92)',
        strokeWidth: 1,
        medalBg:
          'linear-gradient(180deg, #fef08a 0%, #facc15 44%, #b45309 100%)',
        medalRibbon:
          'linear-gradient(90deg, #ef4444 0 30%, #f8fafc 30% 70%, #1D9BF0 70% 100%)',
        glow: '0 0 0 1px rgba(250,204,21,0.28), 0 18px 42px rgba(250,204,21,0.16)',
      };
    case 1:
      return {
        strokeColor: 'rgba(226, 232, 240, 0.82)',
        strokeWidth: 1,
        medalBg:
          'linear-gradient(180deg, #f8fafc 0%, #cbd5e1 48%, #64748b 100%)',
        medalRibbon:
          'linear-gradient(90deg, #38bdf8 0 30%, #f8fafc 30% 70%, #0ea5e9 70% 100%)',
        glow: '0 0 0 1px rgba(226,232,240,0.18), 0 18px 38px rgba(148,163,184,0.13)',
      };
    case 2:
      return {
        strokeColor: 'rgba(251, 146, 60, 0.84)',
        strokeWidth: 1,
        medalBg:
          'linear-gradient(180deg, #fdba74 0%, #f97316 48%, #9a3412 100%)',
        medalRibbon:
          'linear-gradient(90deg, #ef4444 0 30%, #f8fafc 30% 70%, #1D9BF0 70% 100%)',
        glow: '0 0 0 1px rgba(251,146,60,0.18), 0 18px 38px rgba(251,146,60,0.12)',
      };
    default:
      return {
        strokeColor: 'rgba(255, 255, 255, 0.18)',
        strokeWidth: 1,
        medalBg:
          'linear-gradient(180deg, rgba(255,255,255,0.32), rgba(255,255,255,0.08))',
        medalRibbon:
          'linear-gradient(90deg, rgba(255,255,255,0.28), rgba(255,255,255,0.08))',
        glow: '0 14px 30px rgba(0, 0, 0, 0.18)',
      };
  }
};

const processTokensForTreemap = (items: HotToken[]): HotToken[] => {
  const topItems = items.slice(0, 9);
  const totalShare = topItems.reduce((sum, item) => sum + (item.share || 0), 0);

  let processedItems = topItems.map((item) => ({
    ...item,
    normalizedShare:
      totalShare > 0 ? (item.share || 0) / totalShare : 1 / topItems.length,
  }));

  const currentTotal = processedItems.reduce(
    (sum, item: any) => sum + item.normalizedShare,
    0,
  );
  if (Math.abs(currentTotal - 1) > 0.001 && currentTotal > 0) {
    processedItems = processedItems.map((item: any) => ({
      ...item,
      normalizedShare: item.normalizedShare / currentTotal,
    }));
  }

  const finalTotal = processedItems
    .slice(0, -1)
    .reduce((sum, item: any) => sum + item.normalizedShare, 0);
  if (processedItems.length > 0) {
    (processedItems[processedItems.length - 1] as any).normalizedShare =
      Math.max(0.001, 1 - finalTotal);
  }

  return processedItems;
};

// ==================== 组件 Props ====================

interface TokenTreemapVisualizationProps {
  items: HotToken[];
  loading: boolean;
  width: number;
  height: number;
}

interface TokenTreemapNode extends HierarchyRectangularNode<any> {
  data: HotToken & { normalizedShare?: number };
}

type CellKind = 'min' | 'subSmall' | 'small' | 'large';

export function TokenTreemapVisualization({
  items,
  loading,
  width,
  height,
}: TokenTreemapVisualizationProps) {
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // ==================== D3 Treemap 布局计算 ====================
  const treemapNodes = useMemo(() => {
    if (!items.length || loading || width <= 0 || height <= 0)
      return [] as TokenTreemapNode[];

    let processedItems = processTokensForTreemap(items);
    const originalShares = processedItems.map(
      (it: any) => it.normalizedShare ?? 0,
    );
    const originalRanking = originalShares
      .map((s, i) => ({ i, s }))
      .sort((a, b) => b.s - a.s)
      .map(({ i }) => i);
    const topDonorSet = new Set(originalRanking.slice(0, 2));
    const TOP_DONOR_SHRINK_CAP = 0.08;
    const OTHER_DONOR_SHRINK_CAP = 0.15;
    const donorFloorFor = (idx: number) => {
      const base = originalShares[idx] ?? 0;
      const cap = topDonorSet.has(idx)
        ? TOP_DONOR_SHRINK_CAP
        : OTHER_DONOR_SHRINK_CAP;
      return Math.max(0.001, base * (1 - cap));
    };

    const totalArea = Math.max(1, width * height);
    const MIN_WIDTH = 40;
    const MIN_HEIGHT = 40;
    const MIN_AREA = MIN_WIDTH * MIN_HEIGHT;
    const baseShare = MIN_AREA / totalArea;

    const shares = processedItems.map((it: any) => it.normalizedShare ?? 0);
    const needBoostIdx: number[] = [];
    let shortfall = 0;
    shares.forEach((s, idx) => {
      if (s < baseShare) {
        needBoostIdx.push(idx);
        shortfall += baseShare - s;
      }
    });

    if (shortfall > 0) {
      needBoostIdx.forEach((idx) => {
        (processedItems[idx] as any).normalizedShare = baseShare;
        shares[idx] = baseShare;
      });

      const candidateIdx = shares
        .map((s, i) => ({ i, s }))
        .filter(({ i }) => !needBoostIdx.includes(i))
        .sort((a, b) => b.s - a.s)
        .map(({ i }) => i);

      let remaining = shortfall;
      let start = 0;
      const MIN_SHARE = 0.001;
      while (remaining > 1e-9 && candidateIdx.length > 0) {
        const donors = candidateIdx.slice(start, start + 2);
        if (donors.length === 0) break;
        const perDonor = remaining / donors.length;
        let borrowedThisRound = 0;
        donors.forEach((idx) => {
          const current = shares[idx];
          const capacity = Math.max(0, current - MIN_SHARE);
          const take = Math.min(perDonor, capacity);
          if (take > 0) {
            shares[idx] = current - take;
            (processedItems[idx] as any).normalizedShare = shares[idx];
            borrowedThisRound += take;
          }
        });
        remaining = Math.max(0, remaining - borrowedThisRound);
        start += 2;
        if (start >= candidateIdx.length) {
          start = 0;
          if (borrowedThisRound < 1e-9) break;
        }
      }

      const newTotal = processedItems.reduce(
        (sum, it: any) => sum + (it.normalizedShare ?? 0),
        0,
      );
      if (newTotal > 0) {
        processedItems = processedItems.map((it: any) => ({
          ...it,
          normalizedShare: (it.normalizedShare ?? 0) / newTotal,
        }));
      }
    }

    const treemapForMeasure = createTreemap<any>()
      .size([width, height])
      .padding(2)
      .round(true)
      .tile(treemapSquarify);

    const measureLayout = (itemsWithShare: HotToken[]) => {
      const rootMeasure = hierarchy<any>({ children: itemsWithShare })
        .sum((d) =>
          'normalizedShare' in d
            ? Math.max((d as any).normalizedShare || 0, 0.001)
            : 0,
        )
        .sort((a, b) => (b.value || 0) - (a.value || 0));
      treemapForMeasure(rootMeasure);
      return rootMeasure.leaves() as TokenTreemapNode[];
    };

    const isotonicDecreaseWithLowerBounds = (
      s0: number[],
      lb: number[],
      order: number[],
      sumTarget: number,
    ): number[] => {
      const n = s0.length;
      const a: number[] = new Array(n);
      const L: number[] = new Array(n);
      for (let k = 0; k < n; k++) {
        const idx = order[k];
        a[k] = s0[idx];
        L[k] = Math.max(0.001, lb[idx] ?? 0.001);
      }
      type Block = {
        start: number;
        end: number;
        value: number;
        lowerMax: number;
      };
      const applyPAV = (vals: number[], lowers: number[]) => {
        const blocks: Block[] = [];
        for (let i = 0; i < vals.length; i++) {
          const v0 = Math.max(lowers[i], vals[i]);
          blocks.push({ start: i, end: i, value: v0, lowerMax: lowers[i] });
          while (blocks.length >= 2) {
            const b = blocks[blocks.length - 1];
            const c = blocks[blocks.length - 2];
            if (c.value < b.value - 1e-12) {
              const lenA = c.end - c.start + 1;
              const lenB = b.end - b.start + 1;
              const avg = (c.value * lenA + b.value * lenB) / (lenA + lenB);
              const mergedLower = Math.max(c.lowerMax, b.lowerMax);
              const merged: Block = {
                start: c.start,
                end: b.end,
                value: Math.max(mergedLower, avg),
                lowerMax: mergedLower,
              };
              blocks.pop();
              blocks.pop();
              blocks.push(merged);
            } else {
              break;
            }
          }
        }
        const out = new Array(vals.length).fill(0);
        for (const b of blocks) {
          for (let i = b.start; i <= b.end; i++)
            out[i] = Math.max(lowers[i], b.value);
        }
        return out;
      };
      let x = applyPAV(a, L);
      for (let t = 0; t < 6; t++) {
        const sum = x.reduce((s, v) => s + v, 0);
        const scale = sum > 0 ? sumTarget / sum : 1;
        x = x.map((v, i) => Math.max(L[i], v * scale));
        x = applyPAV(x, L);
      }
      const out: number[] = new Array(n);
      for (let k = 0; k < n; k++) out[order[k]] = x[k];
      return out;
    };

    for (let iter = 0; iter < 5; iter++) {
      const leavesMeasure = measureLayout(processedItems);
      const epsilon = 0.5;
      const addShareByIndex: Map<number, number> = new Map();
      let totalAddShare = 0;
      const rows = new Map<string, TokenTreemapNode[]>();
      leavesMeasure.forEach((leaf) => {
        const key = `${Math.round(leaf.y0 / epsilon) * epsilon}-${Math.round(leaf.y1 / epsilon) * epsilon}`;
        const arr = rows.get(key) || [];
        arr.push(leaf);
        rows.set(key, arr);
      });

      rows.forEach((rowLeaves) => {
        const rowHeight = rowLeaves[0] ? rowLeaves[0].y1 - rowLeaves[0].y0 : 0;
        const needRowHeight = rowHeight < MIN_HEIGHT;
        const currentRowArea = rowLeaves.reduce(
          (s, lf) => s + (lf.x1 - lf.x0) * (lf.y1 - lf.y0),
          0,
        );
        const desiredRowArea = MIN_HEIGHT * width;
        const rowAreaDeficit = needRowHeight
          ? Math.max(0, desiredRowArea - currentRowArea)
          : 0;

        if (rowAreaDeficit > 0) {
          const perArea = rowAreaDeficit / rowLeaves.length;
          const perShare = perArea / totalArea;
          rowLeaves.forEach((lf) => {
            const idx = leavesMeasure.indexOf(lf);
            const prev = addShareByIndex.get(idx) || 0;
            addShareByIndex.set(idx, prev + perShare);
            totalAddShare += perShare;
          });
        }

        const effectiveRowHeight = Math.max(rowHeight, MIN_HEIGHT);
        rowLeaves.forEach((lf) => {
          const widthNow = lf.x1 - lf.x0;
          if (widthNow + 1e-9 < MIN_WIDTH) {
            const needArea = (MIN_WIDTH - widthNow) * effectiveRowHeight;
            const needShare = needArea / totalArea;
            const idx = leavesMeasure.indexOf(lf);
            const prev = addShareByIndex.get(idx) || 0;
            addShareByIndex.set(idx, prev + needShare);
            totalAddShare += needShare;
          }
        });
      });

      if (totalAddShare <= 1e-9) break;

      const s0 = processedItems.map((it: any) => it.normalizedShare ?? 0);
      const lb: number[] = s0.map((s, i) => donorFloorFor(i));
      addShareByIndex.forEach((add, idx) => {
        lb[idx] = Math.max(lb[idx], s0[idx] + add);
      });
      const sNew = isotonicDecreaseWithLowerBounds(s0, lb, originalRanking, 1);
      processedItems = processedItems.map((it: any, i: number) => ({
        ...it,
        normalizedShare: Math.max(0.001, sNew[i]),
      }));
    }

    const treemapLayout = createTreemap<any>()
      .size([width, height])
      .padding(2)
      .round(true)
      .tile(treemapSquarify);

    const root = hierarchy<any>({ children: processedItems })
      .sum((d) =>
        'normalizedShare' in d
          ? Math.max((d as any).normalizedShare || 0, 0.001)
          : 0,
      )
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    treemapLayout(root);
    return root.leaves() as TokenTreemapNode[];
  }, [items, loading, width, height]);

  const dispatchTokenHover = useCallback(
    (symbol: string, element: HTMLElement) => {
      window.dispatchEvent(
        new CustomEvent('xhunt:token-hover', {
          detail: {
            ticker: `$${symbol}`,
            element,
          },
        }),
      );
    },
    [],
  );

  const clearTokenHover = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent('xhunt:token-hover', { detail: null }),
    );
  }, []);

  const getCellSize = (d: TokenTreemapNode) => ({
    w: d.x1 - d.x0,
    h: d.y1 - d.y0,
  });

  const getCellKind = (d: TokenTreemapNode): CellKind => {
    const { w, h } = getCellSize(d);
    if ((w < 60 && h < 65) || h <= 42 || w <= 42) return 'min';
    if (w < 100 && h >= 65 && h <= 200) return 'subSmall';
    if ((w < 130 || h < 80) && h <= 200) return 'small';
    return 'large';
  };

  const getIconMetrics = (d: TokenTreemapNode) => {
    const { w, h } = getCellSize(d);
    const area = w * h;
    const radius = Math.max(
      10,
      Math.min(20, Math.sqrt(area) / 8, (Math.min(w, h) - 10) / 2),
    );
    return {
      radius,
      size: radius * 2,
      left: 12,
      top: 12,
      centerX: radius + 12,
      centerY: radius + 12,
    };
  };

  const getTokenCardBackground = (d: TokenTreemapNode, isHovered: boolean) => {
    const tone = getTokenTone(
      d.data.pricePct24H || 0,
      theme === 'light' ? 'light' : 'dark',
    );
    const hoverGlow = isHovered
      ? 'rgba(255,255,255,0.30)'
      : 'rgba(255,255,255,0.20)';

    if (theme === 'light') {
      return [
        'radial-gradient(circle at 14% 0%, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.08) 23%, transparent 44%)',
        `radial-gradient(circle at 92% 16%, ${tone.soft} 0%, rgba(255,255,255,0.04) 20%, transparent 40%)`,
        `radial-gradient(circle at 8% 92%, ${tone.accent}14 0%, transparent 32%)`,
        'linear-gradient(160deg, rgba(255,255,255,0.05) 0%, transparent 32%, rgba(40,24,36,0.20) 100%)',
        `linear-gradient(145deg, ${tone.from} 0%, ${tone.via} 47%, ${tone.to} 100%)`,
      ].join(', ');
    }

    return [
      `radial-gradient(circle at 14% 0%, ${hoverGlow} 0%, rgba(255,255,255,0.08) 24%, transparent 44%)`,
      `radial-gradient(circle at 92% 16%, ${tone.soft} 0%, transparent 36%)`,
      `radial-gradient(circle at 8% 92%, ${tone.accent}1f 0%, transparent 34%)`,
      'linear-gradient(160deg, rgba(255,255,255,0.13) 0%, transparent 34%, rgba(0,0,0,0.38) 100%)',
      `linear-gradient(145deg, ${tone.from} 0%, ${tone.via} 48%, ${tone.to} 100%)`,
    ].join(', ');
  };

  const getOverlayBackground = (isHovered: boolean) => {
    if (theme === 'dark') {
      return isHovered
        ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.04), rgba(15, 23, 42, 0.14))'
        : 'linear-gradient(135deg, rgba(15, 23, 42, 0.16), rgba(15, 23, 42, 0.34))';
    }
    return isHovered
      ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.04), rgba(40, 24, 36, 0.08))'
      : 'linear-gradient(135deg, transparent, rgba(40, 24, 36, 0.15))';
  };

  const renderTokenAvatar = (d: TokenTreemapNode) => {
    const icon = getIconMetrics(d);
    return (
      <div
        style={{
          position: 'absolute',
          left: icon.left,
          top: icon.top,
          width: icon.size,
          height: icon.size,
          borderRadius: '9999px',
          overflow: 'hidden',
          border: '2px solid rgba(255, 255, 255, 0.88)',
          boxShadow: '0 8px 16px rgba(0,0,0,0.28)',
          background: 'rgba(15, 23, 42, 0.35)',
          cursor: 'pointer',
          zIndex: 7,
        }}
        onMouseEnter={(event) =>
          dispatchTokenHover(d.data.symbol, event.currentTarget)
        }
        onMouseLeave={clearTokenHover}
      >
        <img
          src={d.data.image}
          alt={d.data.symbol}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </div>
    );
  };

  const renderRankBadge = (index: number) => {
    if (index >= 3) return null;
    const rankingStyle = getRankingStyle(index);
    const rankLabel = `${index + 1}`;

    return (
      <div
        style={{
          position: 'absolute',
          right: 9,
          top: 0,
          width: 22,
          height: 29,
          pointerEvents: 'none',
          zIndex: 8,
          filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.30))',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 5,
            top: 0,
            width: 12,
            height: 15,
            clipPath:
              'polygon(0 0, 38% 0, 50% 42%, 62% 0, 100% 0, 78% 100%, 50% 72%, 22% 100%)',
            background: rankingStyle.medalRibbon,
            opacity: 0.95,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 1,
            top: 9,
            width: 20,
            height: 20,
            borderRadius: '9999px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            background: rankingStyle.medalBg,
            border: `1.2px solid ${rankingStyle.strokeColor}`,
            boxShadow:
              'inset 0 1px 3px rgba(255,255,255,0.42), inset 0 -5px 8px rgba(0,0,0,0.22), 0 0 12px rgba(255,255,255,0.10)',
            fontSize: 11,
            fontWeight: 950,
            lineHeight: 1,
            textShadow: '0 2px 3px rgba(0,0,0,0.42)',
          }}
        >
          {rankLabel}
        </div>
      </div>
    );
  };

  const renderTokenSymbol = (
    d: TokenTreemapNode,
    style: React.CSSProperties,
    fontSize: number,
    align: 'left' | 'center' = 'left',
  ) => {
    return (
      <span
        title={d.data.symbol}
        style={{
          display: 'block',
          color: '#ffffff',
          fontSize,
          fontWeight: 800,
          lineHeight: 1.12,
          letterSpacing: '-0.035em',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textAlign: align,
          textShadow: '0 3px 10px rgba(0,0,0,0.72), 0 1px 1px rgba(0,0,0,0.86)',
          cursor: 'pointer',
          ...style,
        }}
        onMouseEnter={(event) =>
          dispatchTokenHover(d.data.symbol, event.currentTarget)
        }
        onMouseLeave={clearTokenHover}
      >
        {truncateSymbol(d.data.symbol)}
      </span>
    );
  };

  const renderTokenMetrics = (
    d: TokenTreemapNode,
    priceFontSize: number,
    pctFontSize: number,
    compact = false,
    priceDisplayMode: PriceDisplayMode = 'full',
    omitPctDecimals = false,
    showPrice = true,
  ) => {
    const tone = getTokenTone(
      d.data.pricePct24H || 0,
      theme === 'light' ? 'light' : 'dark',
    );
    const price = formatPrice(d.data.price, priceDisplayMode);

    return (
      <>
        {showPrice && price && (
          <span
            style={{
              color: tone.priceText,
              fontSize: priceFontSize,
              fontWeight: 700,
              lineHeight: compact ? 1.05 : 1.12,
              letterSpacing: '-0.02em',
              display: 'block',
              maxWidth: '100%',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textShadow: '0 2px 8px rgba(0,0,0,0.78)',
            }}
          >
            {price}
          </span>
        )}
        <span
          style={{
            color: tone.text,
            fontSize: pctFontSize,
            fontWeight: 900,
            lineHeight: compact ? 1.05 : 1.12,
            letterSpacing: '-0.03em',
            display: 'block',
            maxWidth: '100%',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textShadow: `0 0 14px ${tone.accent}66, 0 2px 8px rgba(0,0,0,0.78)`,
          }}
        >
          {formatPct(d.data.pricePct24H || 0, omitPctDecimals)}
        </span>
      </>
    );
  };

  const renderCellText = (d: TokenTreemapNode) => {
    const { w, h } = getCellSize(d);
    const kind = getCellKind(d);
    const icon = getIconMetrics(d);

    if (kind === 'min') return null;

    if (kind === 'subSmall') {
      const nameFontSize = Math.max(8, Math.min(12, Math.min(w / 10, h / 6)));
      const priceFontSize = Math.max(8, Math.min(11, Math.min(w / 11, h / 7)));
      const pctFontSize = Math.max(8, Math.min(12, Math.min(w / 10, h / 6)));
      const top = icon.top + icon.size + 6;
      const availableHeight = h - top - 6;
      const showMetrics = availableHeight >= 28;
      const showPrice = h >= 125 && w >= 100;

      return (
        <div
          style={{
            position: 'absolute',
            left: icon.left,
            right: 6,
            top,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            gap: showMetrics ? 4 : 0,
            pointerEvents: 'none',
            zIndex: 6,
          }}
        >
          {renderTokenSymbol(
            d,
            {
              maxWidth: '100%',
              pointerEvents: 'auto',
            },
            nameFontSize,
          )}
          {showMetrics &&
            renderTokenMetrics(
              d,
              priceFontSize,
              pctFontSize,
              true,
              w < 92 ? 'compact' : w < 120 ? 'whole' : 'full',
              w < 112,
              showPrice,
            )}
        </div>
      );
    }

    if (kind === 'small') {
      const nameFontSize = Math.max(8, Math.min(12, Math.min(w / 10, h / 6)));
      const priceFontSize = Math.max(8, Math.min(11, Math.min(w / 11, h / 7)));
      const pctFontSize = Math.max(8, Math.min(12, Math.min(w / 10, h / 6)));
      const nameLeft = icon.left + icon.size + 6;
      const nameFits =
        nameLeft + truncateSymbol(d.data.symbol).length * nameFontSize * 0.6 <=
        w - 4;
      const metricTop = icon.top + icon.size + 6;
      const showMetrics = metricTop + 24 <= h - 4;
      const showPrice = h >= 125 && w >= 92;

      return (
        <>
          {nameFits &&
            renderTokenSymbol(
              d,
              {
                position: 'absolute',
                left: nameLeft,
                right: 6,
                top: icon.top + icon.radius - nameFontSize * 0.56,
                pointerEvents: 'auto',
                zIndex: 6,
              },
              nameFontSize,
            )}
          {showMetrics && (
            <div
              style={{
                position: 'absolute',
                left: 12,
                right: 6,
                top: metricTop,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 4,
                pointerEvents: 'none',
                zIndex: 6,
              }}
            >
              {renderTokenMetrics(
                d,
                priceFontSize,
                pctFontSize,
                true,
                w < 96 ? 'compact' : w < 138 ? 'whole' : 'full',
                w < 118,
                showPrice,
              )}
            </div>
          )}
        </>
      );
    }

    const areaScale = Math.min(1, Math.sqrt((w * h) / 42000));
    const nameFontSize = Math.max(
      12,
      Math.min(22, Math.min(w / 8.4, h / 8.4) * (0.82 + areaScale * 0.14)),
    );
    const priceFontSize = Math.max(11, Math.min(16, Math.min(w / 12, h / 10)));
    const pctFontSize = Math.max(
      10,
      Math.min(priceFontSize, Math.min(w / 13, h / 10)),
    );

    return (
      <div
        style={{
          position: 'absolute',
          left: 12,
          right: 14,
          bottom: 14,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 7,
          pointerEvents: 'none',
          zIndex: 6,
        }}
      >
        {renderTokenSymbol(
          d,
          {
            maxWidth: '100%',
            pointerEvents: 'auto',
          },
          nameFontSize,
        )}
        {renderTokenMetrics(
          d,
          priceFontSize,
          pctFontSize,
          false,
          w < 96 ? 'compact' : w < 160 ? 'whole' : 'full',
          w < 120,
        )}
      </div>
    );
  };

  return (
    <div className='relative rounded-xl' style={{ width, height }}>
      <div className='relative h-full w-full overflow-hidden rounded-xl'>
        {treemapNodes.map((d, index) => {
          const { w, h } = getCellSize(d);
          const rankingStyle = getRankingStyle(index);
          const isHovered = hoveredIndex === index;
          const tone = getTokenTone(
            d.data.pricePct24H || 0,
            theme === 'light' ? 'light' : 'dark',
          );
          const rankLabel = `${index + 1}`;
          const watermarkFontSize = Math.max(
            72,
            Math.min(190, Math.min(w, h) * 0.92),
          );

          return (
            <div
              key={`${d.data.token_raw || d.data.symbol}-${index}`}
              className='absolute cursor-pointer overflow-hidden rounded-xl'
              style={{
                left: d.x0,
                top: d.y0,
                width: w,
                height: h,
                background: getTokenCardBackground(d, isHovered),
                border: `${rankingStyle.strokeWidth}px solid ${rankingStyle.strokeColor}`,
                boxSizing: 'border-box',
                boxShadow: isHovered
                  ? `${rankingStyle.glow}, 0 22px 48px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.20)`
                  : `${rankingStyle.glow}, inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -22px 48px rgba(0,0,0,0.18)`,
                transform: isHovered
                  ? 'translateY(-2px) scale(1.01)'
                  : 'translateY(0) scale(1)',
                transition:
                  'transform 220ms ease, box-shadow 220ms ease, filter 220ms ease',
                zIndex: isHovered ? 20 : 1,
              }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => {
                setHoveredIndex(null);
                clearTokenHover();
              }}
              onClick={() => {
                const searchUrl = `https://x.com/search?q=${encodeURIComponent(d.data.symbol)}&src=typed_query`;
                navigateInX(searchUrl);
              }}
            >
              <div
                className='absolute inset-0 transition-colors duration-300'
                style={{
                  background: getOverlayBackground(isHovered),
                  zIndex: 1,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: `radial-gradient(circle, ${tone.accent}55 0 1px, transparent 1.8px)`,
                  backgroundSize: '14px 14px',
                  opacity: isHovered ? 0.22 : 0.16,
                  mixBlendMode: 'screen',
                  pointerEvents: 'none',
                  zIndex: 2,
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  right: Math.max(8, w * 0.06),
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: watermarkFontSize,
                  fontWeight: 950,
                  lineHeight: 0.85,
                  color: 'rgba(255, 255, 255, 0.065)',
                  fontFamily: 'Georgia, Times New Roman, serif',
                  fontStyle: 'italic',
                  letterSpacing: '-0.10em',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  zIndex: 2,
                  textShadow: '0 10px 28px rgba(0,0,0,0.12)',
                }}
              >
                {rankLabel}
              </span>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 12,
                  boxShadow:
                    'inset 0 1px 0 rgba(255,255,255,0.22), inset 0 0 0 1px rgba(255,255,255,0.05)',
                  pointerEvents: 'none',
                  zIndex: 3,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: '-28%',
                  top: '-40%',
                  width: '80%',
                  height: '160%',
                  transform: 'rotate(26deg)',
                  background:
                    'linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)',
                  opacity: isHovered ? 0.8 : 0.36,
                  pointerEvents: 'none',
                  zIndex: 2,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: w * 0.2,
                  top: h * 0.8,
                  width: Math.max(20, w * 0.62),
                  height: 2,
                  transform: 'rotate(-32deg)',
                  transformOrigin: 'left center',
                  background:
                    'linear-gradient(90deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04), transparent)',
                  pointerEvents: 'none',
                  zIndex: 2,
                }}
              />

              {renderTokenAvatar(d)}
              {renderRankBadge(index)}
              {renderCellText(d)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
