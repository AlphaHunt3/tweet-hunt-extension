import React, { useRef, useEffect } from 'react';
import { hierarchy, treemap as createTreemap } from 'd3-hierarchy';
import { select } from 'd3-selection';
import 'd3-transition';
import { HotItem, TreemapNode } from './types';
import { generateShareColor, processItemsForTreemap } from './utils';
import { useLocalStorage } from '~storage/useLocalStorage.ts';

// 基于字符串生成固定的随机颜色
const generateNameBasedColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  // 生成HSL颜色，确保颜色鲜艳且美观
  const hue = Math.abs(hash) % 360;
  const saturation = 60 + (Math.abs(hash) % 30); // 60-90%，确保颜色鲜艳
  const lightness = 45 + (Math.abs(hash) % 20); // 45-65%，确保不会太亮或太暗

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

// 获取排名边框颜色和奖杯
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

interface TreemapVisualizationProps {
  items: HotItem[];
  loading: boolean;
  width: number;
  height: number;
}

export function TreemapVisualization({ items, loading, width, height }: TreemapVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');

  useEffect(() => {
    if (!svgRef.current || !items.length || loading) return;

    const svg = select(svgRef.current);
    svg.selectAll('*').remove();

    const processedItems = processItemsForTreemap(items);

    // 创建treemap布局
    const treemapLayout = createTreemap<HotItem>()
    .size([width, height])
    .padding(2)
    .round(true);

    // 准备数据 - 修复类型问题
    const root = hierarchy<HotItem>({ children: processedItems } as any)
    .sum(d => {
      // 检查是否是叶子节点（实际数据）
      if ('normalizedShare' in d) {
        return Math.max((d as any).normalizedShare || 0, 0.001);
      }
      return 0;
    })
    .sort((a, b) => (b.value || 0) - (a.value || 0));

    treemapLayout(root);

    // 创建组 - 只处理叶子节点
    const leaves = root.leaves() as TreemapNode[];
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
    .attr('fill', (d, i) => generateShareColor(d.data.share, i))
    .attr('stroke', (d, i) => getRankingStyle(i).strokeColor)
    .attr('stroke-width', (d, i) => getRankingStyle(i).strokeWidth)
    .attr('rx', 6)
    .attr('ry', 6)
    .style('cursor', 'pointer');

    // 添加banner背景图片
    cell.filter(d => Boolean(d.data.twitter.profile.profile_banner_url))
    .append('defs')
    .append('pattern')
    .attr('id', (d, i) => `banner-pattern-${i}`)
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('width', d => d.x1 - d.x0)
    .attr('height', d => d.y1 - d.y0)
    .append('image')
    .attr('href', d => d.data.twitter.profile.profile_banner_url || '')
    .attr('width', d => d.x1 - d.x0)
    .attr('height', d => d.y1 - d.y0)
    .attr('x', 0)
    .attr('y', 0)
    .attr('preserveAspectRatio', 'xMidYMid slice')
    .style('filter', theme === 'dark'
      ? 'brightness(0.4) contrast(1.2) saturate(0.8)'
      : 'brightness(0.7) contrast(1.3) saturate(0.9)');

    // 应用banner背景
    cell.filter(d => Boolean(d.data.twitter.profile.profile_banner_url))
    .select('rect')
    .attr('fill', (d, i) => `url(#banner-pattern-${i})`)
    .attr('stroke', (d, i) => getRankingStyle(i).strokeColor)
    .attr('stroke-width', (d, i) => getRankingStyle(i).strokeWidth);

    // 添加主题适配遮罩 - 根据主题调整
    cell.filter(d => Boolean(d.data.twitter.profile.profile_banner_url))
    .append('rect')
    .attr('class', 'theme-overlay')
    .attr('width', d => d.x1 - d.x0)
    .attr('height', d => d.y1 - d.y0)
    .attr('fill', theme === 'dark'
      ? 'rgba(15, 23, 42, 0.5)'  // 减少遮罩透明度，让图片更清晰
      : 'rgba(0, 0, 0, 0.3)') // 减少遮罩透明度
    .attr('rx', 6)
    .attr('ry', 6);

    // 为没有banner的区域添加主题色背景
    cell.filter(d => !Boolean(d.data.twitter.profile.profile_banner_url))
    .select('rect')
    .attr('fill', d => generateNameBasedColor(d.data.twitter.name))
    .attr('stroke', (d, i) => getRankingStyle(i).strokeColor)
    .attr('stroke-width', (d, i) => getRankingStyle(i).strokeWidth);

    // 为没有背景图的区域也添加遮罩，保持一致性
    cell.filter(d => !Boolean(d.data.twitter.profile.profile_banner_url))
    .append('rect')
    .attr('class', 'theme-overlay')
    .attr('width', d => d.x1 - d.x0)
    .attr('height', d => d.y1 - d.y0)
    .attr('fill', theme === 'dark'
      ? 'rgba(15, 23, 42, 0.2)'  // 进一步减少遮罩，让随机颜色更鲜艳
      : 'rgba(0, 0, 0, 0.1)') // 进一步减少遮罩
    .attr('rx', 6)
    .attr('ry', 6);

    // 添加defs定义
    // const defs = svg.append('defs');

    // 添加头像 - 使用circle和pattern
    const avatarDefs = svg.select('defs');

    // 为每个头像创建圆形裁剪路径
    cell.each(function (d, i) {
      const width = d.x1 - d.x0;
      const height = d.y1 - d.y0;
      const area = width * height;

      // 根据区域面积动态计算头像大小
      // 面积越大，头像越大，但有最小值和最大值限制
      const avatarRadius = Math.max(8, Math.min(20, Math.sqrt(area) / 6));
      const avatarSize = avatarRadius * 2;

      const clipId = `avatar-clip-${i}`;
      avatarDefs.append('clipPath')
      .attr('id', clipId)
      .append('circle')
      .attr('cx', avatarRadius)
      .attr('cy', avatarRadius)
      .attr('r', avatarRadius);

      // 创建头像pattern
      const patternId = `avatar-pattern-${i}`;
      avatarDefs.append('pattern')
      .attr('id', patternId)
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('width', avatarSize)
      .attr('height', avatarSize)
      .append('image')
      .attr('href', d.data.twitter.profile.profile_image_url)
      .attr('width', avatarSize)
      .attr('height', avatarSize)
      .attr('preserveAspectRatio', 'xMidYMid slice');
    });

    // 添加头像圆形
    cell.append('circle')
    .attr('cx', d => {
      const width = d.x1 - d.x0;
      const height = d.y1 - d.y0;
      const area = width * height;
      const avatarRadius = Math.max(8, Math.min(20, Math.sqrt(area) / 6));
      return avatarRadius + 8; // 距离左边缘8px
    })
    .attr('cy', d => {
      const width = d.x1 - d.x0;
      const height = d.y1 - d.y0;
      const area = width * height;
      const avatarRadius = Math.max(8, Math.min(20, Math.sqrt(area) / 6));
      return avatarRadius + 8; // 距离上边缘8px
    })
    .attr('r', d => {
      const width = d.x1 - d.x0;
      const height = d.y1 - d.y0;
      const area = width * height;
      return Math.max(8, Math.min(20, Math.sqrt(area) / 6));
    })
    .attr('fill', (d, i) => `url(#avatar-pattern-${i})`)
    .attr('stroke', 'rgba(255, 255, 255, 0.9)')
    .attr('stroke-width', 2)
    .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))');

    // 添加排名奖杯 - 只为前三名添加
    cell.filter((d, i) => i < 3)
    .append('text')
    .attr('x', d => (d.x1 - d.x0) - 12)
    .attr('y', 20)
    .attr('text-anchor', 'end')
    .attr('font-size', 24)
    .text((d, i) => getRankingStyle(i).trophy)
    .style('filter', 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))')
    .style('pointer-events', 'none') // 禁用奖牌的鼠标事件
    .style('z-index', '5'); // 确保奖牌在头像下方

    // 添加名称文本 - 所有区域都显示
    cell.append('text')
    .attr('x', 8)
    .attr('y', d => (d.y1 - d.y0) - 32)
    .attr('text-anchor', 'start')
    .attr('font-size', d => {
      const width = d.x1 - d.x0;
      const height = d.y1 - d.y0;
      // 根据区域大小动态调整字体大小，最小8px，最大12px
      return Math.max(8, Math.min(12, Math.min(width / 12, height / 8)));
    })
    .attr('font-weight', 'bold')
    .attr('fill', '#ffffff')
    // .style('mix-blend-mode', 'difference')
    .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.8)') // 添加文字阴影提高可读性
    .text(d => {
      const width = d.x1 - d.x0;
      const fontSize = Math.max(8, Math.min(12, Math.min(width / 12, (d.y1 - d.y0) / 8)));
      const maxLength = Math.floor((width - 16) / (fontSize * 0.6)); // 估算字符宽度，考虑内边距
      const name = d.data.twitter.name;
      return name.length > maxLength
        ? name.substring(0, Math.max(1, maxLength - 3)) + '...'
        : d.data.twitter.name;
    });

    // 添加百分比文本
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
    .attr('fill', '#fbbf24')
    // .style('mix-blend-mode', 'difference')
    .text(d => `${(d.data.share * 100).toFixed(1)}%`)
    .style('pointer-events', 'none') // 禁用百分比文本的鼠标事件
    .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.8)'); // 添加文字阴影提高可读性

    // 添加hover效果和事件
    cell
    .style('cursor', 'pointer')
    .on('mouseenter', function (event: MouseEvent, d: TreemapNode) {
      const cellSelection = select(this);

      // 背景图缩小效果
      if (d.data.twitter.profile.profile_banner_url) {
        // 找到对应的pattern中的image并缩小
        const patternId = `banner-pattern-${leaves.indexOf(d)}`;
        svg.select(`#${patternId} image`)
        .transition()
        .duration(300)
        // @ts-ignore
        .attr('width', d => (d.x1 - d.x0) * 1.1) // hover时放大到110%
        // @ts-ignore
        .attr('height', d => (d.y1 - d.y0) * 1.1)
        .attr('x', 0)
        // @ts-ignore
        .attr('y', d => (d.y1 - d.y0) * -0.05); // 向上偏移
      }

      // 遮罩变得几乎透明，让背景更明显
      cellSelection.select('.theme-overlay')
      .transition()
      .duration(300)
      .attr('fill', theme === 'dark'
        ? 'rgba(15, 23, 42, 0.05)'  // hover时遮罩变得几乎透明
        : 'rgba(0, 0, 0, 0.02)');

      // 没有背景图的区域稍微变亮
      if (!d.data.twitter.profile.profile_banner_url) {
        // 遮罩变得几乎透明，让随机颜色更明显
        cellSelection.select('.theme-overlay')
        .transition()
        .duration(300)
        .attr('fill', theme === 'dark'
          ? 'rgba(15, 23, 42, 0.05)'  // hover时遮罩变得几乎透明
          : 'rgba(0, 0, 0, 0.02)');
      }
    })
    .on('mouseleave', function (event: MouseEvent, d: TreemapNode) {
      const cellSelection = select(this);

      // 背景图恢复原尺寸
      if (d.data.twitter.profile.profile_banner_url) {
        const patternId = `banner-pattern-${leaves.indexOf(d)}`;
        svg.select(`#${patternId} image`)
        .transition()
        .duration(300)
        // @ts-ignore
        .attr('width', d => d.x1 - d.x0) // 恢复到100%
        // @ts-ignore
        .attr('height', d => d.y1 - d.y0)
        .attr('x', 0)
        .attr('y', 0);
      }

      // 遮罩恢复原透明度
      cellSelection.select('.theme-overlay')
      .transition()
      .duration(300)
      .attr('fill', theme === 'dark'
        ? 'rgba(15, 23, 42, 0.5)'  // 恢复原遮罩
        : 'rgba(0, 0, 0, 0.3)'); // 恢复原遮罩

      // 没有背景图的区域恢复原亮度
      if (!d.data.twitter.profile.profile_banner_url) {
        // 恢复原遮罩透明度
        cellSelection.select('.theme-overlay')
        .transition()
        .duration(300)
        .attr('fill', theme === 'dark'
          ? 'rgba(15, 23, 42, 0.2)'  // 恢复原遮罩
          : 'rgba(0, 0, 0, 0.1)');
      }
    })
    .on('click', function (event: MouseEvent, d: TreemapNode) {
      window.open(`https://x.com/${d.data.twitter.username}`, '_blank', 'noopener,noreferrer');
    });

    // // 为头像和名字添加KOL hover事件 - 确保在所有其他元素之后添加
    // cell.select('circle')
    //   .style('cursor', 'pointer')
    //   .attr('data-hover-target', 'avatar') // 添加标识
    //   .on('mouseenter', function(event: MouseEvent, d: TreemapNode) {
    //     // 阻止事件冒泡
    //     event.stopPropagation();
    //     // 触发KOL hover事件
    //     const detail: KolHoverDetail = {
    //       username: d.data.twitter.username,
    //       element: this as HTMLElement,
    //       avatar: d.data.twitter.profile.profile_image_url,
    //       name: d.data.twitter.name
    //     };
    //     console.log('KOL hover event triggered', detail)
    //     window.dispatchEvent(new CustomEvent(KOL_HOVER_EVENT, { detail }));
    //   })
    //   .on('mouseleave', function(event: MouseEvent, d: TreemapNode) {
    //     // 阻止事件冒泡
    //     event.stopPropagation();
    //     // 清除KOL hover事件
    //     window.dispatchEvent(new CustomEvent(KOL_HOVER_EVENT, { detail: null }));
    //   });

    // // 为名字文本添加KOL hover事件
    // cell.selectAll('text')
    //   .filter(function() {
    //     // 只选择名字文本（不是奖牌和百分比）
    //     const element = select(this);
    //     return element.attr('fill') === '#ffffff' &&
    //            element.style('pointer-events') !== 'none' &&
    //            !element.text().includes('%') &&
    //            !['🥇', '🥈', '🥉'].includes(element.text());
    //   })
    //   .style('cursor', 'pointer')
    //   .attr('data-hover-target', 'name') // 添加标识
    //   .on('mouseenter', function(event: MouseEvent, d: TreemapNode) {
    //     // 阻止事件冒泡
    //     event.stopPropagation();
    //     // 触发KOL hover事件
    //     const detail: KolHoverDetail = {
    //       username: d.data.twitter.username,
    //       element: this as HTMLElement,
    //       avatar: d.data.twitter.profile.profile_image_url,
    //       name: d.data.twitter.name
    //     };
    //     window.dispatchEvent(new CustomEvent(KOL_HOVER_EVENT, { detail }));
    //   })
    //   .on('mouseleave', function(event: MouseEvent, d: TreemapNode) {
    //     // 阻止事件冒泡
    //     event.stopPropagation();
    //     // 清除KOL hover事件
    //     window.dispatchEvent(new CustomEvent(KOL_HOVER_EVENT, { detail: null }));
    //   });

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
