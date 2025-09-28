// 安全的数值处理函数
export const safeNumber = (
  value: any,
  defaultValue: number = 0,
  min: number = 0,
  max: number = 100
): number => {
  try {
    if (value === null || value === undefined || value === '')
      return defaultValue;
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
    return value.filter((item) => item !== null && item !== undefined);
  } catch {
    return defaultValue;
  }
};

/**
 * 清理错误信息中的版本号前缀
 * 移除类似 [v0.1.05] 这样的版本号前缀
 * @param errorMessage 原始错误信息
 * @returns 清理后的错误信息
 */
export const cleanErrorMessage = (errorMessage: string): string => {
  try {
    if (!errorMessage || typeof errorMessage !== 'string') return errorMessage;

    // 递归移除所有版本号前缀：匹配 [v数字.数字.数字] 格式
    const versionRegex = /\[v[\d.]+\]\s*/g;
    let cleanedMessage = errorMessage;
    let previousMessage = '';

    // 持续清理直到没有变化
    while (cleanedMessage !== previousMessage) {
      previousMessage = cleanedMessage;
      cleanedMessage = cleanedMessage.replace(versionRegex, '');
    }

    return cleanedMessage;
  } catch {
    return errorMessage;
  }
};
