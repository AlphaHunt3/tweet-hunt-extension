import { HotItem } from './types';

// 生成基于share值的颜色
export const generateShareColor = (share: number, index: number): string => {
  const colors = [
    '#ef4444',
    '#f97316',
    '#10b981',
    '#3b82f6',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#84cc16',
    '#f59e0b',
    '#6366f1',
    '#f43f5e',
    '#14b8a6',
  ];
  return colors[index % colors.length] || '#6b7280';
};

// 格式化数字
export const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

// 处理数据比例，确保铺满整个区域
export const processItemsForTreemap = (items: HotItem[]): HotItem[] => {
  // 取前9个项目，重新计算比例使其铺满整个区域
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
