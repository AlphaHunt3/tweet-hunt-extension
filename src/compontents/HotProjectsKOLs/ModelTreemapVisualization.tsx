import React, { useRef, useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  hierarchy,
  treemap as createTreemap,
  treemapSquarify,
  type HierarchyRectangularNode,
} from 'd3-hierarchy';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { navigateInX } from '~contents/utils/navigateInX';
import { TweetModelItem } from './ModelList';

// ==================== 颜色系统：基于 family 生成统一色系 ====================

const stringToHsl = (
  str: string,
  s: number,
  l: number,
): [number, number, number] => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  return [h, s, l];
};

const stringToHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

const MODEL_CARD_PALETTES = [
  { from: '#7a5400', via: '#3b2a05', to: '#05070d', accent: '#facc15' },
  { from: '#075bbf', via: '#0d2f73', to: '#030814', accent: '#38bdf8' },
  { from: '#6d28d9', via: '#3b0764', to: '#07020f', accent: '#a855f7' },
  { from: '#0d9488', via: '#075985', to: '#041014', accent: '#22d3ee' },
  { from: '#3f7d13', via: '#1f4d0f', to: '#071007', accent: '#a3e635' },
  { from: '#9f1239', via: '#581c87', to: '#0c0612', accent: '#fb7185' },
  { from: '#15803d', via: '#064e3b', to: '#04130a', accent: '#4ade80' },
  { from: '#854d0e', via: '#3f2c05', to: '#090806', accent: '#f59e0b' },
];

const getPaletteByKey = (key: string) => {
  return MODEL_CARD_PALETTES[stringToHash(key) % MODEL_CARD_PALETTES.length];
};

/** 生成 family 基础 HSL */
const getFamilyHsl = (family: string): [number, number, number] => {
  return stringToHsl(family.toLowerCase(), 58, 52);
};

/** Family 视图：直接用基础色 */
const generateFamilyBgColor = (family: string): string => {
  const [h, s, l] = getFamilyHsl(family);
  return `hsl(${h}, ${s}%, ${l}%)`;
};

/** Variant 视图：同一 family 内根据 variant 名微调亮度 */
const generateVariantBgColor = (family: string, variant: string): string => {
  const [h, s, baseL] = getFamilyHsl(family);
  let vHash = 0;
  for (let i = 0; i < variant.length; i++) {
    vHash = variant.charCodeAt(i) + ((vHash << 5) - vHash);
  }
  // 在 baseL ± 10% 范围内微调，保证同 family 的 variant 颜色相近但有区分
  const delta = (Math.abs(vHash) % 21) - 10;
  const l = Math.max(35, Math.min(70, baseL + delta));
  return `hsl(${h}, ${s}%, ${l}%)`;
};

/** 强调色（文字/边框用），更鲜艳 */
const generateAccentColor = (family: string): string => {
  const [h, ,] = getFamilyHsl(family);
  return `hsl(${h}, 78%, 58%)`;
};

// ==================== 工具函数 ====================

const getDisplayModelName = (model: string): string => {
  const idx = model.lastIndexOf('/');
  return idx >= 0 ? model.slice(idx + 1) : model;
};

/** 根据区域大小和文字长度智能计算字号 */
const fitFontSize = (
  text: string,
  availableWidth: number,
  availableHeight: number,
  widthFactor: number,
  heightFactor: number,
  minSize: number,
  maxSize: number,
): number => {
  const byArea = Math.min(
    availableWidth / widthFactor,
    availableHeight / heightFactor,
  );
  // 英文字符平均宽度约 0.58em，+1 留左右 padding
  const byTextLength = availableWidth / (text.length * 0.58 + 1);
  return Math.max(minSize, Math.min(maxSize, byArea, byTextLength));
};

const formatViews = (num: number): string => {
  if (num >= 100000000) return (num / 100000000).toFixed(1) + '亿';
  if (num >= 10000) return (num / 10000).toFixed(1) + '万';
  return num.toLocaleString();
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

/** 用 share（百分比）归一化为面积权重 */
const processModelsForTreemap = (items: TweetModelItem[]): TweetModelItem[] => {
  const topItems = items.slice(0, 8);
  const totalShare = topItems.reduce((sum, item) => sum + (item.share || 0), 0);

  let processed = topItems.map((item) => ({
    ...item,
    normalizedShare:
      totalShare > 0 ? (item.share || 0) / totalShare : 1 / topItems.length,
  }));

  // 归一化到 1
  const currentTotal = processed.reduce(
    (sum, it: any) => sum + it.normalizedShare,
    0,
  );
  if (Math.abs(currentTotal - 1) > 0.001 && currentTotal > 0) {
    processed = processed.map((it: any) => ({
      ...it,
      normalizedShare: it.normalizedShare / currentTotal,
    }));
  }

  // 最后一项补齐到 1
  const finalTotal = processed
    .slice(0, -1)
    .reduce((sum, it: any) => sum + it.normalizedShare, 0);
  if (processed.length > 0) {
    (processed[processed.length - 1] as any).normalizedShare = Math.max(
      0.001,
      1 - finalTotal,
    );
  }

  return processed;
};

// ==================== 组件 Props ====================

interface ModelTreemapVisualizationProps {
  familyItems: TweetModelItem[];
  variantItems: TweetModelItem[];
  loading: boolean;
  width: number;
  height: number;
  lang?: string;
  viewMode: 'family' | 'variant';
}

interface ModelTreemapNode extends HierarchyRectangularNode<any> {
  data: TweetModelItem & { normalizedShare?: number };
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  item: TweetModelItem & { normalizedShare?: number };
  viewMode: 'family' | 'variant';
}

export function ModelTreemapVisualization({
  familyItems,
  variantItems,
  loading,
  width,
  height,
  lang = 'zh',
  viewMode,
}: ModelTreemapVisualizationProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    item: {} as any,
    viewMode: 'family',
  });

  const TOOLTIP_WIDTH = 300;

  const clampTooltipPos = useCallback(
    (target: HTMLElement | null, fallbackX: number, fallbackY: number) => {
      const targetRect = target?.getBoundingClientRect();
      const halfW = TOOLTIP_WIDTH / 2;
      let x = targetRect ? targetRect.left + targetRect.width / 2 : fallbackX;
      let y = targetRect ? targetRect.top - 6 : fallbackY - 6;

      if (x + halfW > window.innerWidth - 8) {
        x = window.innerWidth - halfW - 8;
      }
      if (x - halfW < 8) {
        x = halfW + 8;
      }
      // Fixed + body portal: keep the tooltip anchored above the hovered card in viewport coordinates.
      y = Math.max(8, y);

      return { x, y };
    },
    [],
  );

  const handleMouseEnter = useCallback(
    (event: React.MouseEvent<HTMLDivElement>, d: ModelTreemapNode) => {
      const pos = clampTooltipPos(
        event.currentTarget,
        event.clientX,
        event.clientY,
      );
      setTooltip({
        visible: true,
        x: pos.x,
        y: pos.y,
        item: d.data,
        viewMode,
      });
    },
    [clampTooltipPos, viewMode],
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const pos = clampTooltipPos(
        event.currentTarget,
        event.clientX,
        event.clientY,
      );
      setTooltip((prev) => {
        if (!prev.visible) return prev;
        return { ...prev, x: pos.x, y: pos.y };
      });
    },
    [clampTooltipPos],
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  }, []);

  // ==================== D3 Treemap 布局计算 ====================
  const treemapNodes = useMemo(() => {
    const items = viewMode === 'family' ? familyItems : variantItems;
    if (!items.length || loading || width <= 0 || height <= 0)
      return [] as ModelTreemapNode[];

    let processedItems = processModelsForTreemap(items);

    const totalArea = Math.max(1, width * height);
    const MIN_WIDTH = 55;
    const MIN_HEIGHT = 50;
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

    const measureLayout = (itemsWithShare: TweetModelItem[]) => {
      const rootMeasure = hierarchy<any>({ children: itemsWithShare })
        .sum((d) =>
          'normalizedShare' in d
            ? Math.max((d as any).normalizedShare || 0, 0.001)
            : 0,
        )
        .sort((a, b) => (b.value || 0) - (a.value || 0));
      treemapForMeasure(rootMeasure);
      return rootMeasure.leaves() as ModelTreemapNode[];
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

    for (let iter = 0; iter < 5; iter++) {
      const leavesMeasure = measureLayout(processedItems);
      const epsilon = 0.5;
      const addShareByIndex: Map<number, number> = new Map();
      let totalAddShare = 0;
      const rows = new Map<string, ModelTreemapNode[]>();
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
    return root.leaves() as ModelTreemapNode[];
  }, [familyItems, variantItems, loading, width, height, viewMode]);

  const getCellSize = (d: ModelTreemapNode) => ({
    w: d.x1 - d.x0,
    h: d.y1 - d.y0,
  });

  const isMinCell = (d: ModelTreemapNode) => {
    const { w, h } = getCellSize(d);
    return (w < 80 && h < 80) || h <= 55 || w <= 55;
  };

  const isSubSmallCell = (d: ModelTreemapNode) => {
    const { w, h } = getCellSize(d);
    return w < 120 && h >= 55 && h <= 200 && !isMinCell(d);
  };

  const isSmallCell = (d: ModelTreemapNode) => {
    const { w, h } = getCellSize(d);
    const small = (w < 150 || h < 90) && h <= 200;
    return small && !isMinCell(d) && !isSubSmallCell(d);
  };

  const getCardPalette = (d: ModelTreemapNode) => {
    const family = d.data.model_hit?.family || d.data.model;
    const key = viewMode === 'family' ? family : `${family}-${d.data.model}`;
    return getPaletteByKey(key);
  };

  const getCardBackground = (d: ModelTreemapNode, isHovered: boolean) => {
    const palette = getCardPalette(d);
    const hoverGlow = isHovered
      ? 'rgba(255,255,255,0.30)'
      : 'rgba(255,255,255,0.20)';
    if (theme === 'light') {
      return [
        `radial-gradient(circle at 14% 0%, rgba(255,255,255,0.44) 0%, rgba(255,255,255,0.16) 26%, transparent 48%)`,
        `radial-gradient(circle at 92% 16%, ${palette.accent}3d 0%, ${palette.accent}18 20%, transparent 38%)`,
        `radial-gradient(circle at 8% 92%, ${palette.accent}24 0%, transparent 36%)`,
        'linear-gradient(160deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.04) 34%, rgba(0,0,0,0.18) 100%)',
        `linear-gradient(145deg, color-mix(in srgb, ${palette.from} 82%, white) 0%, color-mix(in srgb, ${palette.via} 78%, white) 46%, color-mix(in srgb, ${palette.to} 76%, white) 100%)`,
      ].join(', ');
    }
    return [
      `radial-gradient(circle at 14% 0%, ${hoverGlow} 0%, rgba(255,255,255,0.08) 24%, transparent 44%)`,
      `radial-gradient(circle at 92% 16%, ${palette.accent}33 0%, ${palette.accent}14 18%, transparent 36%)`,
      `radial-gradient(circle at 8% 92%, ${palette.accent}1f 0%, transparent 34%)`,
      'linear-gradient(160deg, rgba(255,255,255,0.13) 0%, transparent 34%, rgba(0,0,0,0.38) 100%)',
      `linear-gradient(145deg, ${palette.from} 0%, ${palette.via} 46%, ${palette.to} 100%)`,
    ].join(', ');
  };

  const getOverlayBackground = (isHovered: boolean) => {
    if (theme === 'dark') {
      return isHovered
        ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.06), rgba(15, 23, 42, 0.16))'
        : 'linear-gradient(135deg, rgba(15, 23, 42, 0.14), rgba(15, 23, 42, 0.32))';
    }
    return isHovered
      ? 'linear-gradient(135deg, rgba(0, 0, 0, 0.02), rgba(0, 0, 0, 0.10))'
      : 'linear-gradient(135deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.22))';
  };

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const renderCellText = (d: ModelTreemapNode, index: number) => {
    const { w, h } = getCellSize(d);
    const name = getDisplayModelName(d.data.model);
    const palette = getCardPalette(d);
    const compact = isMinCell(d);
    const subSmall = isSubSmallCell(d);
    const small = isSmallCell(d);
    const topRank = index < 3;
    const estimatedLines = name.length > 18 ? 3 : name.length > 10 ? 2 : 1;
    const areaScale = Math.min(1, Math.sqrt((w * h) / 42000));
    const baseTitleFontSize = compact
      ? Math.max(
          10,
          Math.min(15, Math.min(w / 5.8, h / (estimatedLines * 2.45))),
        )
      : subSmall
        ? Math.max(
            12,
            Math.min(18, Math.min(w / 6.4, h / (estimatedLines * 2.55))),
          )
        : small
          ? Math.max(
              13,
              Math.min(20, Math.min(w / 6.8, h / (estimatedLines * 2.65))),
            )
          : topRank
            ? Math.max(
                18,
                Math.min(34, Math.min(w / 5.6, h / (estimatedLines * 2.65))),
              )
            : Math.max(
                15,
                Math.min(26, Math.min(w / 7.4, h / (estimatedLines * 2.85))),
              );
    const longNameScale =
      name.length > 10 ? Math.max(0.72, 1 - (name.length - 10) * 0.025) : 1;
    const titleFontSize = Math.max(
      compact ? 9 : 11,
      baseTitleFontSize * longNameScale * (0.82 + areaScale * 0.18),
    );
    const shareFontSize = Math.max(
      10,
      Math.min(titleFontSize * 0.62, Math.min(w / 9.4, h / 7.2)),
    );
    const showShare = h >= 54 && w >= 64;
    const titleLineHeight = 1.2;

    return (
      <div
        style={{
          position: 'absolute',
          left: compact ? 10 : 18,
          right: compact ? 8 : 16,
          top: compact ? 8 : 14,
          bottom: compact ? 8 : 14,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          gap: showShare ? 8 : 0,
          textAlign: 'left',
          pointerEvents: 'none',
          zIndex: 5,
        }}
      >
        <span
          title={name}
          style={{
            display: 'block',
            maxWidth: '100%',
            color: '#ffffff',
            fontSize: titleFontSize,
            fontWeight: 600,
            lineHeight: titleLineHeight,
            letterSpacing: '-0.045em',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
            textShadow:
              '0 3px 10px rgba(0,0,0,0.72), 0 1px 1px rgba(0,0,0,0.86)',
          }}
        >
          {name}
        </span>
        {showShare && (
          <span
            style={{
              color: palette.accent,
              fontSize: shareFontSize,
              fontWeight: 900,
              lineHeight: 0.98,
              letterSpacing: '-0.055em',
              textShadow: `0 0 16px ${palette.accent}66, 0 3px 10px rgba(0,0,0,0.78)`,
            }}
          >
            {(d.data.share || 0).toFixed(1)}%
          </span>
        )}
      </div>
    );
  };

  // ==================== Tooltip 内容渲染 ====================
  const renderTooltip = () => {
    if (!tooltip.visible) return null;
    const d = tooltip.item;
    const summary = lang === 'zh' ? d.summary_cn : d.summary_en;
    if (!summary) return null;

    const isDark = theme === 'dark';
    const charsPerLine = lang === 'zh' ? 24 : 42;
    const estimatedTooltipHeight = Math.min(
      window.innerHeight - 16,
      22 + Math.ceil(summary.length / charsPerLine) * 18.6,
    );
    const tooltipTop = Math.max(tooltip.y, estimatedTooltipHeight + 8);

    return createPortal(
      <div
        style={{
          position: 'fixed',
          zIndex: 99999,
          pointerEvents: 'none',
          left: tooltip.x,
          top: tooltipTop,
          transform: 'translate(-50%, -100%)',
          width: `${TOOLTIP_WIDTH}px`,
          maxHeight: 'calc(100vh - 16px)',
          borderRadius: '10px',
          border: isDark
            ? '1px solid rgba(148,163,184,0.16)'
            : '1px solid rgba(15,23,42,0.10)',
          background: isDark
            ? 'rgba(15, 23, 42, 0.95)'
            : 'rgba(255, 255, 255, 0.98)',
          boxShadow: isDark
            ? '0 12px 32px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.05)'
            : '0 12px 32px rgba(15,23,42,0.14)',
          overflow: 'hidden',
          backdropFilter: 'blur(10px)',
        }}
      >
        <p
          style={{
            margin: 0,
            padding: '11px 12px',
            color: isDark ? '#cbd5e1' : '#334155',
            fontSize: '12px',
            lineHeight: 1.55,
            wordBreak: 'break-word',
          }}
        >
          {summary}
        </p>
      </div>,
      document.body,
    );
  };

  return (
    <div
      ref={wrapperRef}
      className='relative rounded-xl'
      style={{ width, height }}
    >
      <div className='relative h-full w-full overflow-hidden rounded-xl'>
        {treemapNodes.map((d, index) => {
          const { w, h } = getCellSize(d);
          const rankingStyle = getRankingStyle(index);
          const isHovered = hoveredIndex === index;
          const rankLabel = `${index + 1}`;
          const palette = getCardPalette(d);
          const watermarkFontSize = Math.max(
            72,
            Math.min(190, Math.min(w, h) * 0.92),
          );

          return (
            <div
              key={`${d.data.model}-${index}`}
              className='absolute cursor-pointer overflow-hidden rounded-xl'
              style={{
                left: d.x0,
                top: d.y0,
                width: w,
                height: h,
                background: getCardBackground(d, isHovered),
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
              onMouseEnter={(event) => {
                setHoveredIndex(index);
                handleMouseEnter(event, d);
              }}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => {
                setHoveredIndex(null);
                handleMouseLeave();
              }}
              onClick={() => {
                const searchUrl = `https://x.com/search?q=${encodeURIComponent(d.data.model)}&src=typed_query`;
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
                  backgroundImage: `radial-gradient(circle, ${palette.accent}55 0 1px, transparent 1.8px)`,
                  backgroundSize: '14px 14px',
                  opacity: isHovered ? 0.22 : 0.18,
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
                  opacity: isHovered ? 0.8 : 0.38,
                  pointerEvents: 'none',
                  zIndex: 2,
                }}
              />

              {index < 3 && (
                <div
                  style={{
                    position: 'absolute',
                    left: 9,
                    top: 0,
                    width: 22,
                    height: 29,
                    pointerEvents: 'none',
                    zIndex: 6,
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
              )}

              {renderCellText(d, index)}
            </div>
          );
        })}
      </div>
      {renderTooltip()}
    </div>
  );
}
