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