import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { HotToken, TokenTreemapNode } from './types';
import { useLocalStorage } from '~storage/useLocalStorage.ts';

// 基于涨跌幅生成绿红色系
const generateTokenColor = (pricePct24H: number): string => {
  if (pricePct24H >= 0) {
    // 涨幅：绿色系，涨得越多越深绿
    const intensity = Math.min(Math.abs(pricePct24H) * 5, 1); // 调整强度计算
    const lightness = 60 - intensity * 30; // 60% 到 30%，越涨越深绿
    return `hsl(120, 80%, ${lightness}%)`; // 纯绿色
  } else {
    // 跌幅：红色系，跌得越多越深红
    const intensity = Math.min(Math.abs(pricePct24H) * 5, 1); // 调整强度计算
    const lightness = 60 - intensity * 30; // 60% 到 30%，越跌越深红
    return `hsl(0, 80%, ${lightness}%)`; // 纯红色
  }
};

// 获取排名边框颜色和奖牌
const getRankingStyle = (index: number) => {
  switch (index) {
    case 0: // 第一名 - 金色
      return {
        strokeColor: '#ffd700',
        strokeWidth: 3,
        trophy: '🥇',
        trophyColor: '#ffd700',
      };
    case 1: // 第二名 - 银色
      return {
        strokeColor: '#c0c0c0',
        strokeWidth: 2.5,
        trophy: '🥈',
        trophyColor: '#c0c0c0',
      };
    case 2: // 第三名 - 铜色
      return {
        strokeColor: '#cd7f32',
        strokeWidth: 2,
        trophy: '🥉',
        trophyColor: '#cd7f32',
      };
    default:
      return {
        strokeColor: '#ffffff',
        strokeWidth: 1,
        trophy: null,
        trophyColor: null,
      };
  }
};

// 处理数据比例，确保铺满整个区域
const processTokensForTreemap = (items: HotToken[]): HotToken[] => {
  // 取前9个代币，重新计算比例使其铺满整个区域
  const topItems = items.slice(0, 9);
  const totalShare = topItems.reduce((sum, item) => sum + item.share, 0);

  // 强制铺满：先按比例分配，然后将剩余面积平摊
  let processedItems = topItems.map((item) => ({
    ...item,
    normalizedShare: item.share / totalShare, // 归一化比例
  }));

  // 确保总和严格等于1，避免D3计算误差
  const currentTotal = processedItems.reduce(
    (sum, item) => sum + item.normalizedShare,
    0
  );
  if (Math.abs(currentTotal - 1) > 0.001) {
    // 如果总和不等于1，按比例调整所有项目
    const adjustmentFactor = 1 / currentTotal;
    processedItems = processedItems.map((item) => ({
      ...item,
      normalizedShare: item.normalizedShare * adjustmentFactor,
    }));
  }

  // 最后一个项目承担剩余误差，确保严格铺满
  const finalTotal = processedItems
    .slice(0, -1)
    .reduce((sum, item) => sum + item.normalizedShare, 0);
  if (processedItems.length > 0) {
    processedItems[processedItems.length - 1].normalizedShare = 1 - finalTotal;
  }

  return processedItems;
};

interface TokenTreemapVisualizationProps {
  items: HotToken[];
  loading: boolean;
  width: number;
  height: number;
}

export function TokenTreemapVisualization({
  items,
  loading,
  width,
  height,
}: TokenTreemapVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');

  useEffect(() => {
    if (!svgRef.current || !items.length || loading) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    let processedItems = processTokensForTreemap(items);
    // 记录初始份额与排名，用于限制捐赠缩减比例
    const originalShares = processedItems.map(
      (it: any) => it.normalizedShare ?? 0
    );
    const originalRanking = originalShares
      .map((s, i) => ({ i, s }))
      .sort((a, b) => b.s - a.s)
      .map(({ i }) => i);
    const topDonorSet = new Set(originalRanking.slice(0, 2));
    const TOP_DONOR_SHRINK_CAP = 0.08; // Top2 最多缩减20%
    const OTHER_DONOR_SHRINK_CAP = 0.15; // 其他最多缩减40%
    const donorFloorFor = (idx: number) => {
      const base = originalShares[idx] ?? 0;
      const cap = topDonorSet.has(idx)
        ? TOP_DONOR_SHRINK_CAP
        : OTHER_DONOR_SHRINK_CAP;
      return Math.max(0.001, base * (1 - cap));
    };
    // 记录初始排名顺序，后续调整保持序不变
    const originalOrder = processedItems
      .map((it: any, i: number) => ({ i, s: it.normalizedShare ?? 0 }))
      .sort((a, b) => b.s - a.s)
      .map(({ i }) => i);

    // 保证每个区域至少达到最小宽高（先按最小面积近似处理），不足则从最大的两个区域平均借出
    const totalArea = Math.max(1, width * height);
    const MIN_WIDTH = 40;
    const MIN_HEIGHT = 40;
    const MIN_AREA = MIN_WIDTH * MIN_HEIGHT; // 60x40
    const baseShare = MIN_AREA / totalArea;

    // 计算需要提升到最小面积的项目及总缺口
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
      // 先设置小块到基线
      needBoostIdx.forEach((idx) => {
        (processedItems[idx] as any).normalizedShare = baseShare;
        shares[idx] = baseShare;
      });

      // 候选借出者：按当前份额从大到小排序（排除已提升到基线的）
      const candidateIdx = shares
        .map((s, i) => ({ i, s }))
        .filter(({ i }) => !needBoostIdx.includes(i))
        .sort((a, b) => b.s - a.s)
        .map(({ i }) => i);

      // 按“最大的两个平均借”的规则，但若不足，则继续向下一个借
      let remaining = shortfall;
      let start = 0;
      const MIN_SHARE = 0.001; // 保底，避免为0
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

        // 如果两者已接近下限，则尝试下一组最大的两个
        start += 2;
        if (start >= candidateIdx.length) {
          // 回到开头继续迭代，直到剩余为0或无法再借
          start = 0;
          // 若本轮借不到任何，跳出避免死循环
          if (borrowedThisRound < 1e-9) break;
        }
      }

      // 最后归一化，避免浮点误差
      const newTotal = processedItems.reduce(
        (sum, it: any) => sum + (it.normalizedShare ?? 0),
        0
      );
      if (newTotal > 0) {
        processedItems = processedItems.map((it: any) => ({
          ...it,
          normalizedShare: (it.normalizedShare ?? 0) / newTotal,
        }));
      }
    }

    // 迭代：基于实际布局再细化调整，确保最终渲染矩形满足最小宽高
    const treemapForMeasure = d3
      .treemap<HotToken>()
      .size([width, height])
      .padding(2)
      .round(true)
      .tile(d3.treemapSquarify);

    const measureLayout = (itemsWithShare: HotToken[]) => {
      const rootMeasure = d3
        .hierarchy<HotToken>({ children: itemsWithShare } as any)
        .sum((d) =>
          'normalizedShare' in d
            ? Math.max((d as any).normalizedShare || 0, 0.001)
            : 0
        )
        .sort((a, b) => (b.value || 0) - (a.value || 0));
      treemapForMeasure(rootMeasure);
      return rootMeasure.leaves() as TokenTreemapNode[];
    };

    const borrowFromTopTwo = (
      deltaShareTotal: number,
      excludeIdx: Set<number>
    ) => {
      if (deltaShareTotal <= 0) return;
      const ranked = processedItems
        .map((it: any, i: number) => ({ i, s: it.normalizedShare ?? 0 }))
        .filter(({ i }) => !excludeIdx.has(i))
        .sort((a, b) => b.s - a.s);
      if (ranked.length === 0) return;
      const donors = ranked.slice(0, Math.min(2, ranked.length));
      let remaining = deltaShareTotal;
      donors.forEach(({ i }, idx) => {
        if (remaining <= 1e-9) return;
        const take = remaining / (donors.length - idx);
        const cur = (processedItems[i] as any).normalizedShare ?? 0;
        const floor = donorFloorFor(i);
        const actual = Math.max(0, Math.min(cur - floor, take));
        (processedItems[i] as any).normalizedShare = cur - actual;
        remaining -= actual;
      });
      // 若两者不足，继续向下一批借
      let k = 2;
      while (remaining > 1e-9 && k < ranked.length) {
        const { i } = ranked[k];
        const cur = (processedItems[i] as any).normalizedShare ?? 0;
        const floor = donorFloorFor(i);
        const actual = Math.max(0, Math.min(cur - floor, remaining));
        (processedItems[i] as any).normalizedShare = cur - actual;
        remaining -= actual;
        k += 1;
      }
    };

    // 等序（保持初始排名）约束的单调递减回归，带下界与总和约束
    const isotonicDecreaseWithLowerBounds = (
      s0: number[],
      lb: number[],
      order: number[],
      sumTarget: number
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
            const a = blocks[blocks.length - 2];
            if (a.value < b.value - 1e-12) {
              const lenA = a.end - a.start + 1;
              const lenB = b.end - b.start + 1;
              const avg = (a.value * lenA + b.value * lenB) / (lenA + lenB);
              const mergedLower = Math.max(a.lowerMax, b.lowerMax);
              const merged: Block = {
                start: a.start,
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
      // 归一化并迭代以满足下界与单调
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

      // 统计需要增加的面积（按share表示），以及排除的索引
      const addShareByIndex: Map<number, number> = new Map();
      let totalAddShare = 0;
      const needIdx = new Set<number>();

      // 按行聚合（同一行的 y0、y1 基本一致）
      const rows = new Map<string, TokenTreemapNode[]>();
      leavesMeasure.forEach((leaf, idx) => {
        const key = `${Math.round(leaf.y0 / epsilon) * epsilon}-${
          Math.round(leaf.y1 / epsilon) * epsilon
        }`;
        const arr = rows.get(key) || [];
        arr.push(leaf);
        rows.set(key, arr);
      });

      rows.forEach((rowLeaves) => {
        const rowHeight = rowLeaves[0] ? rowLeaves[0].y1 - rowLeaves[0].y0 : 0;
        const needRowHeight = rowHeight < MIN_HEIGHT;
        const currentRowArea = rowLeaves.reduce(
          (s, lf) => s + (lf.x1 - lf.x0) * (lf.y1 - lf.y0),
          0
        );
        const desiredRowArea = MIN_HEIGHT * width;
        const rowAreaDeficit = needRowHeight
          ? Math.max(0, desiredRowArea - currentRowArea)
          : 0;

        // 先分配行高度不足的增量（均分给本行元素）
        if (rowAreaDeficit > 0) {
          const perArea = rowAreaDeficit / rowLeaves.length;
          const perShare = perArea / totalArea;
          rowLeaves.forEach((lf) => {
            const idx = leavesMeasure.indexOf(lf);
            const prev = addShareByIndex.get(idx) || 0;
            addShareByIndex.set(idx, prev + perShare);
            totalAddShare += perShare;
            needIdx.add(idx);
          });
        }

        // 再保证最小宽度
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
            needIdx.add(idx);
          }
        });
      });

      if (totalAddShare <= 1e-9) break; // 已满足

      // 使用等序单调回归：对需要增加的索引设置下界，其余设置为最小下界，且捐赠者地板不低于原始份额折扣
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

    // 创建treemap布局（最终渲染）
    const treemap = d3
      .treemap<HotToken>()
      .size([width, height])
      .padding(2)
      .round(true)
      .tile(d3.treemapSquarify); // 更倾向于接近正方形，提升最小宽高的可达性

    // 准备数据
    const root = d3
      .hierarchy<HotToken>({ children: processedItems } as any)
      .sum((d) => {
        // 检查是否是叶子节点（实际数据）
        if ('normalizedShare' in d) {
          return Math.max((d as any).normalizedShare || 0, 0.001);
        }
        return 0;
      })
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    treemap(root);

    // 创建组 - 只处理叶子节点
    const leaves = root.leaves() as TokenTreemapNode[];

    // 添加defs定义
    const defs = svg.append('defs');

    const cell = svg
      .selectAll('g')
      .data(leaves)
      .enter()
      .append('g')
      .attr('class', 'treemap-cell')
      .attr('transform', (d) => `translate(${d.x0},${d.y0})`);

    // 添加背景矩形
    cell
      .append('rect')
      .attr('class', 'treemap-rect')
      .attr('width', (d) => d.x1 - d.x0)
      .attr('height', (d) => d.y1 - d.y0)
      .attr('fill', (d) => generateTokenColor(d.data.pricePct24H))
      .attr('stroke', (d, i) => getRankingStyle(i).strokeColor)
      .attr('stroke-width', (d, i) => getRankingStyle(i).strokeWidth)
      .attr('rx', 6)
      .attr('ry', 6)
      .style('cursor', 'pointer');

    // 添加主题适配遮罩
    cell
      .append('rect')
      .attr('class', 'theme-overlay')
      .attr('width', (d) => d.x1 - d.x0)
      .attr('height', (d) => d.y1 - d.y0)
      .attr(
        'fill',
        theme === 'dark' ? 'rgba(15, 23, 42, 0.3)' : 'rgba(0, 0, 0, 0.2)'
      )
      .attr('rx', 6)
      .attr('ry', 6);

    // 为每个token创建图标pattern
    leaves.forEach((d, i) => {
      const patternId = `token-icon-pattern-${i}`;

      const nodeWidth = d.x1 - d.x0;
      const nodeHeight = d.y1 - d.y0;
      const area = nodeWidth * nodeHeight;

      // 计算头像尺寸（与后续绘制保持一致）
      const iconRadius = Math.max(10, Math.min(20, Math.sqrt(area) / 8));
      const diameter = iconRadius * 2;
      const circleCenterX = iconRadius + 12; // 距离左边缘12px
      const circleCenterY = iconRadius + 12; // 距离上边缘12px
      const patternX = circleCenterX - iconRadius;
      const patternY = circleCenterY - iconRadius;

      const pattern = defs
        .append('pattern')
        .attr('id', patternId)
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('x', patternX)
        .attr('y', patternY)
        .attr('width', diameter)
        .attr('height', diameter);

      pattern
        .append('image')
        .attr('href', d.data.image)
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', diameter)
        .attr('height', diameter)
        .attr('preserveAspectRatio', 'xMidYMid slice');
    });

    // 添加代币图标圆形
    cell
      .append('circle')
      .attr('cx', (d) => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        const area = width * height;
        const avatarRadius = Math.max(10, Math.min(20, Math.sqrt(area) / 8));
        return avatarRadius + 12; // 距离左边缘12px
      })
      .attr('cy', (d) => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        const area = width * height;
        const avatarRadius = Math.max(10, Math.min(20, Math.sqrt(area) / 8));
        return avatarRadius + 12; // 距离上边缘12px
      })
      .attr('r', (d) => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        const area = width * height;
        return Math.max(10, Math.min(20, Math.sqrt(area) / 8));
      })
      .attr('fill', (d, i) => `url(#token-icon-pattern-${i})`)
      .attr('stroke', 'rgba(255, 255, 255, 0.9)')
      .attr('stroke-width', 2)
      .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))');

    // 添加排名奖牌 - 只为前三名添加
    cell
      .filter((d, i) => i < 3)
      .append('text')
      .attr('x', (d) => d.x1 - d.x0 - 12)
      .attr('y', 20)
      .attr('text-anchor', 'end')
      .attr('font-size', 24)
      .text((d, i) => getRankingStyle(i).trophy)
      .style('filter', 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))')
      .style('pointer-events', 'none'); // 禁用奖牌的鼠标事件

    // 区域精细化分类
    // 最小区域：宽<60 且 高<60，仅展示头像
    const isMinCell = (d: TokenTreemapNode) => {
      const width = d.x1 - d.x0;
      const height = d.y1 - d.y0;
      return (width < 60 && height < 65) || height <= 42 || width <= 42;
    };

    // 次小区域：宽<60 且 高>=60，展示名字在头像下方，不展示百分比
    const isSubSmallCell = (d: TokenTreemapNode) => {
      const width = d.x1 - d.x0;
      const height = d.y1 - d.y0;
      return width < 100 && height >= 65 && height <= 200 && !isMinCell(d);
    };

    // 小区域：宽<130 或 高<80，且不是最小/次小；展示名字在头像右侧，不展示百分比
    const isSmallCell = (d: TokenTreemapNode) => {
      const width = d.x1 - d.x0;
      const height = d.y1 - d.y0;
      const small = (width < 130 || height < 80) && height <= 200;
      return small && !isMinCell(d) && !isSubSmallCell(d);
    };

    // const minCells = cell.filter((d) => isMinCell(d as TokenTreemapNode));
    const subSmallCells = cell.filter((d) =>
      isSubSmallCell(d as TokenTreemapNode)
    );
    const smallCells = cell.filter((d) => isSmallCell(d as TokenTreemapNode));
    const largeCells = cell.filter(
      (d) =>
        !isMinCell(d as TokenTreemapNode) &&
        !isSubSmallCell(d as TokenTreemapNode) &&
        !isSmallCell(d as TokenTreemapNode)
    );

    // 次小区域：头像下方显示代币名
    subSmallCells
      .append('text')
      .attr('x', (d) => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        const area = width * height;
        const r = Math.max(10, Math.min(20, Math.sqrt(area) / 8));
        const cx = r + 12;
        return cx;
      })
      .attr('y', (d) => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        const area = width * height;
        const r = Math.max(10, Math.min(20, Math.sqrt(area) / 8));
        const cy = r + 12;
        const fontSize = Math.max(
          8,
          Math.min(12, Math.min(width / 10, height / 6))
        );
        const spacing = 6;
        return Math.min(height - 4, cy + r + spacing + fontSize * 0.9);
      })
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'alphabetic')
      .attr('font-size', (d) => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        return Math.max(8, Math.min(12, Math.min(width / 10, height / 6)));
      })
      .attr('font-weight', 'bold')
      .attr('fill', '#ffffff')
      .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.8)')
      .text((d) => {
        const symbol = d.data.symbol;
        return symbol.length > 6 ? symbol.substring(0, 6) + '...' : symbol;
      })
      .style('cursor', 'pointer')
      .on('mouseenter', function (event: MouseEvent, d: TokenTreemapNode) {
        const detail = {
          ticker: `$${d.data.symbol}`,
          element: this as unknown as HTMLElement,
        };
        window.dispatchEvent(new CustomEvent('xhunt:token-hover', { detail }));
      })
      .on('mouseleave', function () {
        window.dispatchEvent(
          new CustomEvent('xhunt:token-hover', { detail: null })
        );
      });

    // 次小区域：名字下方显示百分比
    subSmallCells
      .append('text')
      .attr('x', (d) => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        const area = width * height;
        const r = Math.max(10, Math.min(20, Math.sqrt(area) / 8));
        const cx = r + 12;
        return cx;
      })
      .attr('y', (d) => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        const area = width * height;
        const r = Math.max(10, Math.min(20, Math.sqrt(area) / 8));
        const cy = r + 12;
        const nameFont = Math.max(
          8,
          Math.min(12, Math.min(width / 10, height / 6))
        );
        const pctFont = Math.max(
          8,
          Math.min(12, Math.min(width / 10, height / 6))
        );
        const spacing = 6; // name 与 icon 的间距
        const spacingBelow = 2; // 百分比与名字的间距
        const nameY = Math.min(height - 4, cy + r + spacing + nameFont * 0.9);
        return Math.min(height - 4, nameY + spacingBelow + pctFont * 0.9);
      })
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'alphabetic')
      .attr('font-size', (d) => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        return Math.max(8, Math.min(12, Math.min(width / 10, height / 6)));
      })
      .attr('font-weight', 'bold')
      .attr('fill', (d) => (d.data.pricePct24H >= 0 ? '#22c55e' : '#ef4444'))
      .attr('stroke', 'rgba(0, 0, 0, 0.55)')
      .attr('stroke-width', 1.5)
      .style('paint-order', 'stroke')
      .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.8)')
      .text((d) => {
        const pct = d.data.pricePct24H * 100;
        const sign = pct >= 0 ? '+' : '';
        return `${sign}${pct.toFixed(1)}%`;
      });

    // 小区域：头像右侧显示代币名
    smallCells
      .append('text')
      .attr('x', (d) => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        const area = width * height;
        const r = Math.max(10, Math.min(20, Math.sqrt(area) / 8));
        const cx = r + 12; // 头像中心x
        const spacing = 6;
        return cx + r + spacing; // 头像右侧留白
      })
      .attr('y', (d) => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        const area = width * height;
        const r = Math.max(10, Math.min(20, Math.sqrt(area) / 8));
        const cy = r + 12; // 头像中心y
        return cy;
      })
      .attr('dominant-baseline', 'middle')
      .attr('text-anchor', 'start')
      .attr('font-size', (d) => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        // 尽量保持可读
        return Math.max(8, Math.min(12, Math.min(width / 10, height / 6)));
      })
      .attr('font-weight', 'bold')
      .attr('fill', '#ffffff')
      .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.8)')
      .text((d) => {
        const symbol = d.data.symbol;
        return symbol.length > 6 ? symbol.substring(0, 6) + '...' : symbol;
      })
      .style('cursor', 'pointer')
      .on('mouseenter', function (event: MouseEvent, d: TokenTreemapNode) {
        const detail = {
          ticker: `$${d.data.symbol}`,
          element: this as unknown as HTMLElement,
        };
        window.dispatchEvent(new CustomEvent('xhunt:token-hover', { detail }));
      })
      .on('mouseleave', function () {
        window.dispatchEvent(
          new CustomEvent('xhunt:token-hover', { detail: null })
        );
      });

    // 小区域：名字下方显示百分比（与名字同列，位于右侧）
    smallCells
      .append('text')
      .attr('x', (d) => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        const area = width * height;
        const r = Math.max(10, Math.min(20, Math.sqrt(area) / 8));
        const cx = r + 12; // 头像中心x
        const spacing = 6;
        return cx + r + spacing; // 与名字对齐
      })
      .attr('y', (d) => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        const area = width * height;
        const r = Math.max(10, Math.min(20, Math.sqrt(area) / 8));
        const cy = r + 12; // 头像中心y
        const nameFont = Math.max(
          8,
          Math.min(12, Math.min(width / 10, height / 6))
        );
        const pctFont = Math.max(
          8,
          Math.min(12, Math.min(width / 10, height / 6))
        );
        const spacingBelow = 2; // 百分比与名字的间距
        const yBase = cy + Math.max(6, nameFont * 0.9);
        return Math.min(height - 4, yBase + spacingBelow + pctFont * 0.7);
      })
      .attr('text-anchor', 'start')
      .attr('dominant-baseline', 'alphabetic')
      .attr('font-size', (d) => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        return Math.max(8, Math.min(12, Math.min(width / 10, height / 6)));
      })
      .attr('font-weight', 'bold')
      .attr('fill', (d) => (d.data.pricePct24H >= 0 ? '#22c55e' : '#ef4444'))
      .attr('stroke', 'rgba(0, 0, 0, 0.55)')
      .attr('stroke-width', 1.5)
      .style('paint-order', 'stroke')
      .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.8)')
      .text((d) => {
        const pct = d.data.pricePct24H * 100;
        const sign = pct >= 0 ? '+' : '';
        return `${sign}${pct.toFixed(1)}%`;
      });

    // 大区域：左下角显示代币名和涨跌幅
    largeCells
      .append('text')
      .attr('x', 8)
      .attr('y', (d) => d.y1 - d.y0 - 32)
      .attr('text-anchor', 'start')
      .attr('font-size', (d) => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        return Math.max(8, Math.min(12, Math.min(width / 12, height / 8)));
      })
      .attr('font-weight', 'bold')
      .attr('fill', '#ffffff')
      .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.8)')
      .text((d) => {
        const symbol = d.data.symbol;
        return symbol.length > 6 ? symbol.substring(0, 6) + '...' : symbol;
      })
      .style('cursor', 'pointer')
      .on('mouseenter', function (event: MouseEvent, d: TokenTreemapNode) {
        const detail = {
          ticker: `$${d.data.symbol}`,
          element: this as unknown as HTMLElement,
        };
        window.dispatchEvent(new CustomEvent('xhunt:token-hover', { detail }));
      })
      .on('mouseleave', function (event: MouseEvent, d: TokenTreemapNode) {
        window.dispatchEvent(
          new CustomEvent('xhunt:token-hover', { detail: null })
        );
      });

    largeCells
      .append('text')
      .attr('x', 8)
      .attr('y', (d) => d.y1 - d.y0 - 16)
      .attr('text-anchor', 'start')
      .attr('font-size', (d) => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        return Math.max(9, Math.min(14, Math.min(width / 10, height / 6)));
      })
      .attr('font-weight', 'bold')
      .attr('fill', (d) => {
        const pct = d.data.pricePct24H;
        // deeper, higher-contrast shades
        return pct >= 0 ? '#22c55e' : '#ef4444';
      })
      .attr('stroke', 'rgba(0, 0, 0, 0.55)')
      .attr('stroke-width', 1.5)
      .style('paint-order', 'stroke')
      .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.8)')
      .text((d) => {
        const pct = d.data.pricePct24H * 100;
        const sign = pct >= 0 ? '+' : '';
        return `${sign}${pct.toFixed(1)}%`;
      });

    // 为代币头像添加hover事件，触发TickerTips
    cell
      .select('circle')
      .style('cursor', 'pointer')
      .on('mouseenter', function (event: MouseEvent, d: TokenTreemapNode) {
        // 触发token hover事件
        const detail = {
          ticker: `$${d.data.symbol}`,
          element: this as HTMLElement,
        };
        window.dispatchEvent(new CustomEvent('xhunt:token-hover', { detail }));
      })
      .on('mouseleave', function (event: MouseEvent, d: TokenTreemapNode) {
        // 清除token hover事件
        window.dispatchEvent(
          new CustomEvent('xhunt:token-hover', { detail: null })
        );
      });

    // 添加背景装饰 - 代币符号的大号水印
    cell
      .append('text')
      .attr('x', (d) => (d.x1 - d.x0) / 2)
      .attr('y', (d) => (d.y1 - d.y0) / 2 + 10)
      .attr('text-anchor', 'middle')
      .attr('font-size', (d) => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        // 大号水印字体，占据区域的1/3到1/2
        return Math.max(20, Math.min(60, Math.min(width / 3, height / 3)));
      })
      .attr('font-weight', '900')
      .attr('fill', 'rgba(255, 255, 255, 0.08)') // 极淡的白色水印
      .attr('font-family', 'Arial Black, sans-serif')
      .style('letter-spacing', '2px')
      .style('pointer-events', 'none') // 不影响点击事件
      .text((d) => d.data.symbol);

    // 添加渐变装饰线条
    const gradientDefs = svg.select('defs');

    // 创建渐变定义
    gradientDefs
      .append('linearGradient')
      .attr('id', 'decorative-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '100%')
      .selectAll('stop')
      .data([
        { offset: '0%', color: 'rgba(255, 255, 255, 0.1)' },
        { offset: '50%', color: 'rgba(255, 255, 255, 0.05)' },
        { offset: '100%', color: 'rgba(255, 255, 255, 0.02)' },
      ])
      .enter()
      .append('stop')
      .attr('offset', (d) => d.offset)
      .attr('stop-color', (d) => d.color);

    // 添加装饰性的对角线
    cell
      .append('line')
      .attr('x1', (d) => (d.x1 - d.x0) * 0.2)
      .attr('y1', (d) => (d.y1 - d.y0) * 0.8)
      .attr('x2', (d) => (d.x1 - d.x0) * 0.8)
      .attr('y2', (d) => (d.y1 - d.y0) * 0.2)
      .attr('stroke', 'url(#decorative-gradient)')
      .attr('stroke-width', 2)
      .style('pointer-events', 'none');

    // 添加小圆点装饰
    cell
      .append('circle')
      .attr('cx', (d) => (d.x1 - d.x0) * 0.85)
      .attr('cy', (d) => (d.y1 - d.y0) * 0.15)
      .attr('r', 3)
      .attr('fill', 'rgba(255, 255, 255, 0.1)')
      .style('pointer-events', 'none');

    cell
      .append('circle')
      .attr('cx', (d) => (d.x1 - d.x0) * 0.15)
      .attr('cy', (d) => (d.y1 - d.y0) * 0.85)
      .attr('r', 2)
      .attr('fill', 'rgba(255, 255, 255, 0.08)')
      .style('pointer-events', 'none');
    // 添加hover效果和事件
    cell
      .style('cursor', 'pointer')
      .on('mouseenter', function (event: MouseEvent, d: TokenTreemapNode) {
        const cellSelection = d3.select(this);

        // 遮罩变淡，让背景更明显
        cellSelection
          .select('.theme-overlay')
          .transition()
          .duration(300)
          .attr(
            'fill',
            theme === 'dark'
              ? 'rgba(15, 23, 42, 0.05)' // hover时遮罩变得几乎透明
              : 'rgba(0, 0, 0, 0.02)'
          );
      })
      .on('mouseleave', function (event: MouseEvent, d: TokenTreemapNode) {
        const cellSelection = d3.select(this);

        // 遮罩恢复原透明度
        cellSelection
          .select('.theme-overlay')
          .transition()
          .duration(300)
          .attr(
            'fill',
            theme === 'dark' ? 'rgba(15, 23, 42, 0.3)' : 'rgba(0, 0, 0, 0.2)'
          );
      })
      .on('click', function (event: MouseEvent, d: TokenTreemapNode) {
        // 跳转到Twitter搜索该代币
        const searchUrl = `https://x.com/search?q=${encodeURIComponent(
          d.data.symbol
        )}&src=typed_query`;
        window.open(searchUrl, '_blank', 'noopener,noreferrer');
      });
  }, [items, loading, width, height, theme]);

  return (
    <div className='relative overflow-hidden rounded-xl'>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className='w-full h-full cursor-pointer'
      />
    </div>
  );
}
