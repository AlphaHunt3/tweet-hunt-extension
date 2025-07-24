import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { HotToken, TokenTreemapNode } from './types';
import { useLocalStorage } from '~storage/useLocalStorage.ts';

// 基于涨跌幅生成绿红色系
const generateTokenColor = (pricePct24H: number): string => {
  if (pricePct24H >= 0) {
    // 涨幅：绿色系，涨得越多越深绿
    const intensity = Math.min(Math.abs(pricePct24H) * 5, 1); // 调整强度计算
    const lightness = 60 - (intensity * 30); // 60% 到 30%，越涨越深绿
    return `hsl(120, 80%, ${lightness}%)`; // 纯绿色
  } else {
    // 跌幅：红色系，跌得越多越深红
    const intensity = Math.min(Math.abs(pricePct24H) * 5, 1); // 调整强度计算
    const lightness = 60 - (intensity * 30); // 60% 到 30%，越跌越深红
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
        trophyColor: '#ffd700'
      };
    case 1: // 第二名 - 银色
      return {
        strokeColor: '#c0c0c0',
        strokeWidth: 2.5,
        trophy: '🥈',
        trophyColor: '#c0c0c0'
      };
    case 2: // 第三名 - 铜色
      return {
        strokeColor: '#cd7f32',
        strokeWidth: 2,
        trophy: '🥉',
        trophyColor: '#cd7f32'
      };
    default:
      return {
        strokeColor: '#ffffff',
        strokeWidth: 1,
        trophy: null,
        trophyColor: null
      };
  }
};

// 处理数据比例，确保铺满整个区域
const processTokensForTreemap = (items: HotToken[]): HotToken[] => {
  // 取前9个代币，重新计算比例使其铺满整个区域
  const topItems = items.slice(0, 9);
  const totalShare = topItems.reduce((sum, item) => sum + item.share, 0);

  // 强制铺满：先按比例分配，然后将剩余面积平摊
  let processedItems = topItems.map(item => ({
    ...item,
    normalizedShare: item.share / totalShare // 归一化比例
  }));

  // 确保总和严格等于1，避免D3计算误差
  const currentTotal = processedItems.reduce((sum, item) => sum + item.normalizedShare, 0);
  if (Math.abs(currentTotal - 1) > 0.001) {
    // 如果总和不等于1，按比例调整所有项目
    const adjustmentFactor = 1 / currentTotal;
    processedItems = processedItems.map(item => ({
      ...item,
      normalizedShare: item.normalizedShare * adjustmentFactor
    }));
  }

  // 最后一个项目承担剩余误差，确保严格铺满
  const finalTotal = processedItems.slice(0, -1).reduce((sum, item) => sum + item.normalizedShare, 0);
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

export function TokenTreemapVisualization({ items, loading, width, height }: TokenTreemapVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');

  useEffect(() => {
    if (!svgRef.current || !items.length || loading) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const processedItems = processTokensForTreemap(items);

    // 创建treemap布局
    const treemap = d3.treemap<HotToken>()
      .size([width, height])
      .padding(2)
      .round(true);

    // 准备数据
    const root = d3.hierarchy<HotToken>({ children: processedItems } as any)
      .sum(d => {
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

    const cell = svg.selectAll('g')
      .data(leaves)
      .enter().append('g')
      .attr('class', 'treemap-cell')
      .attr('transform', d => `translate(${d.x0},${d.y0})`);

    // 添加背景矩形
    cell.append('rect')
      .attr('class', 'treemap-rect')
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.y1 - d.y0)
      .attr('fill', d => generateTokenColor(d.data.pricePct24H))
      .attr('stroke', (d, i) => getRankingStyle(i).strokeColor)
      .attr('stroke-width', (d, i) => getRankingStyle(i).strokeWidth)
      .attr('rx', 6)
      .attr('ry', 6)
      .style('cursor', 'pointer');

    // 添加主题适配遮罩
    cell.append('rect')
      .attr('class', 'theme-overlay')
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.y1 - d.y0)
      .attr('fill', theme === 'dark'
        ? 'rgba(15, 23, 42, 0.3)'
        : 'rgba(0, 0, 0, 0.2)')
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

      const pattern = defs.append('pattern')
        .attr('id', patternId)
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('x', patternX)
        .attr('y', patternY)
        .attr('width', diameter)
        .attr('height', diameter);

      pattern.append('image')
        .attr('href', d.data.image)
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', diameter)
        .attr('height', diameter)
        .attr('preserveAspectRatio', 'xMidYMid slice');
    });

    // 添加代币图标圆形
    cell.append('circle')
      .attr('cx', d => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        const area = width * height;
        const avatarRadius = Math.max(10, Math.min(20, Math.sqrt(area) / 8));
        return avatarRadius + 12; // 距离左边缘12px
      })
      .attr('cy', d => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        const area = width * height;
        const avatarRadius = Math.max(10, Math.min(20, Math.sqrt(area) / 8));
        return avatarRadius + 12; // 距离上边缘12px
      })
      .attr('r', d => {
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
    cell.filter((d, i) => i < 3)
      .append('text')
      .attr('x', d => (d.x1 - d.x0) - 12)
      .attr('y', 20)
      .attr('text-anchor', 'end')
      .attr('font-size', 24)
      .text((d, i) => getRankingStyle(i).trophy)
      .style('filter', 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))')
      .style('pointer-events', 'none'); // 禁用奖牌的鼠标事件

    // 添加代币符号文本 - 左对齐，底部区域
    cell.append('text')
      .attr('x', 8)
      .attr('y', d => (d.y1 - d.y0) - 32)
      .attr('text-anchor', 'start')
      .attr('font-size', d => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        return Math.max(8, Math.min(12, Math.min(width / 12, height / 8)));
      })
      .attr('font-weight', 'bold')
      .attr('fill', '#ffffff')
      .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.8)')
      .text(d => {
        const width = d.x1 - d.x0;
        const fontSize = Math.max(8, Math.min(12, Math.min(width / 12, (d.y1 - d.y0) / 8)));
        const maxLength = Math.floor((width - 16) / (fontSize * 0.6)); // 考虑左右边距
        const symbol = d.data.symbol;
        return symbol.length > maxLength
          ? symbol.substring(0, Math.max(1, maxLength - 3)) + '...'
          : symbol;
      })
      .style('cursor', 'pointer')
      .on('mouseenter', function(event: MouseEvent, d: TokenTreemapNode) {
        // 触发token hover事件
        const detail = {
          ticker: `$${d.data.symbol}`,
          element: this as unknown as HTMLElement
        };
        window.dispatchEvent(new CustomEvent('xhunt:token-hover', { detail }));
      })
      .on('mouseleave', function(event: MouseEvent, d: TokenTreemapNode) {
        // 清除token hover事件
        window.dispatchEvent(new CustomEvent('xhunt:token-hover', { detail: null }));
      });

    // 添加涨跌幅文本 - 左对齐，符号下方
    cell.append('text')
      .attr('x', 8)
      .attr('y', d => (d.y1 - d.y0) - 16)
      .attr('text-anchor', 'start')
      .attr('font-size', d => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        return Math.max(9, Math.min(14, Math.min(width / 10, height / 6)));
      })
      .attr('font-weight', 'bold')
      .attr('fill', d => {
        const pct = d.data.pricePct24H;
        if (pct >= 0) {
          return '#22c55e'; // 鲜明绿色 - 上涨
        } else {
          return '#ef4444'; // 鲜明红色 - 下跌
        }
      })
      .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.8)')
      .text(d => {
        const pct = d.data.pricePct24H * 100;
        const sign = pct >= 0 ? '+' : '';
        return `${sign}${pct.toFixed(1)}%`;
      });

    // 为代币头像添加hover事件，触发TickerTips
    cell.select('circle')
      .style('cursor', 'pointer')
      .on('mouseenter', function(event: MouseEvent, d: TokenTreemapNode) {
        // 触发token hover事件
        const detail = {
          ticker: `$${d.data.symbol}`,
          element: this as HTMLElement
        };
        window.dispatchEvent(new CustomEvent('xhunt:token-hover', { detail }));
      })
      .on('mouseleave', function(event: MouseEvent, d: TokenTreemapNode) {
        // 清除token hover事件
        window.dispatchEvent(new CustomEvent('xhunt:token-hover', { detail: null }));
      });

    // 添加背景装饰 - 代币符号的大号水印
    cell.append('text')
      .attr('x', d => (d.x1 - d.x0) / 2)
      .attr('y', d => (d.y1 - d.y0) / 2 + 10)
      .attr('text-anchor', 'middle')
      .attr('font-size', d => {
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
      .text(d => d.data.symbol);

    // 添加渐变装饰线条
    const gradientDefs = svg.select('defs');

    // 创建渐变定义
    gradientDefs.append('linearGradient')
      .attr('id', 'decorative-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '100%')
      .selectAll('stop')
      .data([
        { offset: '0%', color: 'rgba(255, 255, 255, 0.1)' },
        { offset: '50%', color: 'rgba(255, 255, 255, 0.05)' },
        { offset: '100%', color: 'rgba(255, 255, 255, 0.02)' }
      ])
      .enter().append('stop')
      .attr('offset', d => d.offset)
      .attr('stop-color', d => d.color);

    // 添加装饰性的对角线
    cell.append('line')
      .attr('x1', d => (d.x1 - d.x0) * 0.2)
      .attr('y1', d => (d.y1 - d.y0) * 0.8)
      .attr('x2', d => (d.x1 - d.x0) * 0.8)
      .attr('y2', d => (d.y1 - d.y0) * 0.2)
      .attr('stroke', 'url(#decorative-gradient)')
      .attr('stroke-width', 2)
      .style('pointer-events', 'none');

    // 添加小圆点装饰
    cell.append('circle')
      .attr('cx', d => (d.x1 - d.x0) * 0.85)
      .attr('cy', d => (d.y1 - d.y0) * 0.15)
      .attr('r', 3)
      .attr('fill', 'rgba(255, 255, 255, 0.1)')
      .style('pointer-events', 'none');

    cell.append('circle')
      .attr('cx', d => (d.x1 - d.x0) * 0.15)
      .attr('cy', d => (d.y1 - d.y0) * 0.85)
      .attr('r', 2)
      .attr('fill', 'rgba(255, 255, 255, 0.08)')
      .style('pointer-events', 'none');
    // 添加hover效果和事件
    cell
      .style('cursor', 'pointer')
      .on('mouseenter', function(event: MouseEvent, d: TokenTreemapNode) {
        const cellSelection = d3.select(this);

        // 遮罩变淡，让背景更明显
        cellSelection.select('.theme-overlay')
          .transition()
          .duration(300)
          .attr('fill', theme === 'dark'
            ? 'rgba(15, 23, 42, 0.05)'  // hover时遮罩变得几乎透明
            : 'rgba(0, 0, 0, 0.02)');
      })
      .on('mouseleave', function(event: MouseEvent, d: TokenTreemapNode) {
        const cellSelection = d3.select(this);

        // 遮罩恢复原透明度
        cellSelection.select('.theme-overlay')
          .transition()
          .duration(300)
          .attr('fill', theme === 'dark'
            ? 'rgba(15, 23, 42, 0.3)'
            : 'rgba(0, 0, 0, 0.2)');
      })
      .on('click', function(event: MouseEvent, d: TokenTreemapNode) {
        // 跳转到Twitter搜索该代币
        const searchUrl = `https://x.com/search?q=${encodeURIComponent(d.data.symbol)}&src=typed_query`;
        window.open(searchUrl, '_blank', 'noopener,noreferrer');
      });
  }, [items, loading, width, height, theme]);

  return (
    <div className="relative overflow-hidden rounded-xl">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="w-full h-full cursor-pointer"
      />
    </div>
  );
}
