// 安全的数值处理函数
export const safeNumber = (value: any, defaultValue: number = 0, min: number = 0, max: number = 100): number => {
  try {
    if (value === null || value === undefined || value === '') return defaultValue;
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    if (isNaN(num) || !isFinite(num)) return defaultValue;
    return Math.max(min, Math.min(max, num));
  } catch {
    return defaultValue;
  }
};

// 安全的字符串处理函数
export const safeString = (value: any, defaultValue: string = ''): string => {
  try {
    if (value === null || value === undefined) return defaultValue;
    return String(value).trim() || defaultValue;
  } catch {
    return defaultValue;
  }
};

// 安全的数组处理函数
export const safeArray = <T>(value: any, defaultValue: T[] = []): T[] => {
  try {
    if (!Array.isArray(value)) return defaultValue;
    return value.filter(item => item !== null && item !== undefined);
  } catch {
    return defaultValue;
  }
};