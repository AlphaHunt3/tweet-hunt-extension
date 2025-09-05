import React from 'react';
import { safeArray } from '~/utils/dataValidation.ts';
import { MultiFieldItem } from '~types';

interface AbilityTagsProps {
  abilities: MultiFieldItem[];
  personalizedColor?: string; // 新增：接收个性化颜色
}

// 能力标签展示组件 - 接收个性化颜色作为 prop
function AbilityTags({ abilities, personalizedColor }: AbilityTagsProps) {
  // 安全处理 abilities 数组并提取前两个能力名称
  const safeAbilities = safeArray(abilities);
  const displayAbilities = safeAbilities.slice(0, 3).map(item => {
    try {
      // @ts-ignore
      const key = Object.keys(item)[0];
      return key || 'Unknown';
    } catch {
      return 'Unknown';
    }
  });

  return (
    <span
      className="text-sm"
      style={{ color: personalizedColor || '#1D9BF0' }} // 使用传入的颜色或默认蓝色
    >
      ({displayAbilities.length > 0 ? displayAbilities.join(', ') : 'Loading...'})
    </span>
  );
}

export default React.memo(AbilityTags);
