// 低调的颜色调色板 - 饱和度和亮度都比较低
const MUTED_COLORS = [
  { h: 210, s: 35, l: 55 }, // 蓝灰色
  { h: 150, s: 30, l: 50 }, // 绿灰色
  { h: 30, s: 40, l: 55 },  // 棕橙色
  { h: 270, s: 35, l: 55 }, // 紫灰色
  { h: 180, s: 30, l: 50 }, // 青灰色
  { h: 60, s: 35, l: 55 },  // 黄绿色
  { h: 330, s: 30, l: 55 }, // 粉灰色
  { h: 120, s: 25, l: 50 }, // 深绿色
  { h: 240, s: 30, l: 55 }, // 深蓝色
  { h: 0, s: 35, l: 55 },   // 深红色
];

// 基于能力组合生成个性化颜色 - 导出为公共函数
export const generatePersonalizedColor = (abilities: string[]): { primary: string; secondary: string } => {
  try {
    const safeAbilities = Array.isArray(abilities) ? abilities.filter(item => item !== null && item !== undefined) : [];
    
    // 如果没有能力数据，使用默认颜色
    if (safeAbilities.length === 0) {
      const defaultColor = MUTED_COLORS[0];
      return {
        primary: `hsl(${defaultColor.h}, ${defaultColor.s}%, ${defaultColor.l}%)`,
        secondary: `hsla(${defaultColor.h}, ${defaultColor.s}%, ${defaultColor.l}%, 0.15)`
      };
    }

    // 基于能力名称生成哈希值
    let hash = 0;
    const combinedAbilities = safeAbilities.join('').toLowerCase();
    
    for (let i = 0; i < combinedAbilities.length; i++) {
      const char = combinedAbilities.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }

    // 使用哈希值选择基础颜色
    const colorIndex = Math.abs(hash) % MUTED_COLORS.length;
    const baseColor = MUTED_COLORS[colorIndex];

    // 基于能力数量微调颜色
    const abilityCount = safeAbilities.length;
    const hueShift = (abilityCount * 7) % 30; // 小幅度色相偏移
    const saturationAdjust = Math.min(5, abilityCount); // 轻微饱和度调整
    
    const finalHue = (baseColor.h + hueShift) % 360;
    const finalSaturation = Math.max(20, Math.min(45, baseColor.s + saturationAdjust));
    const finalLightness = baseColor.l;

    return {
      primary: `hsl(${finalHue}, ${finalSaturation}%, ${finalLightness}%)`,
      secondary: `hsla(${finalHue}, ${finalSaturation}%, ${finalLightness}%, 0.15)`
    };
  } catch {
    // 异常情况下使用默认颜色
    const defaultColor = MUTED_COLORS[0];
    return {
      primary: `hsl(${defaultColor.h}, ${defaultColor.s}%, ${defaultColor.l}%)`,
      secondary: `hsla(${defaultColor.h}, ${defaultColor.s}%, ${defaultColor.l}%, 0.15)`
    };
  }
};
// 基于分数动态生成颜色的函数
export const generateScoreBasedColor = (score: number): { primary: string; secondary: string } => {
  if (score >= 90) {
    // 90-100分：深紫色 - 代表卓越、神秘、高贵
    return {
      primary: '#7c3aed', // violet-600
      secondary: 'rgba(124, 58, 237, 0.15)'
    };
  } else if (score >= 80) {
    // 80-89分：蓝色 - 代表专业、可靠、智慧
    return {
      primary: '#2563eb', // blue-600
      secondary: 'rgba(37, 99, 235, 0.15)'
    };
  } else if (score >= 70) {
    // 70-79分：青色 - 代表清新、活力、创新
    return {
      primary: '#0891b2', // cyan-600
      secondary: 'rgba(8, 145, 178, 0.15)'
    };
  } else if (score >= 60) {
    // 60-69分：绿色 - 代表成长、平衡、稳定
    return {
      primary: '#16a34a', // green-600
      secondary: 'rgba(22, 163, 74, 0.15)'
    };
  } else if (score >= 50) {
    // 50-59分：黄色 - 代表警示、中等、需要关注
    return {
      primary: '#ca8a04', // yellow-600
      secondary: 'rgba(202, 138, 4, 0.15)'
    };
  } else if (score >= 40) {
    // 40-49分：橙色 - 代表警告、活跃但不稳定
    return {
      primary: '#ea580c', // orange-600
      secondary: 'rgba(234, 88, 12, 0.15)'
    };
  } else if (score >= 30) {
    // 30-39分：深橙色 - 代表关注、需要改进
    return {
      primary: '#dc2626', // red-600
      secondary: 'rgba(220, 38, 38, 0.15)'
    };
  } else if (score >= 20) {
    // 20-29分：红色 - 代表问题、风险
    return {
      primary: '#b91c1c', // red-700
      secondary: 'rgba(185, 28, 28, 0.15)'
    };
  } else if (score >= 10) {
    // 10-19分：深红色 - 代表严重问题
    return {
      primary: '#991b1b', // red-800
      secondary: 'rgba(153, 27, 27, 0.15)'
    };
  } else {
    // 0-9分：极深红色 - 代表极低质量
    return {
      primary: '#7f1d1d', // red-900
      secondary: 'rgba(127, 29, 29, 0.15)'
    };
  }
};