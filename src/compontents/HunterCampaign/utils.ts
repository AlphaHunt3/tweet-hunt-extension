/**
 * 格式化数字为简洁格式（如 10k, 1.5M）
 * 使用浏览器标准的 Intl.NumberFormat API
 */
export function formatNumber(num: number, locale?: string): string {
    return new Intl.NumberFormat(locale || 'en-US', {
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(num);
}

export const isUrlValid = (url: string | undefined | null): boolean => {
    if (!url) return false;
    if (!url || typeof url !== 'string' || url.trim().length === 0) return false;
    try {
        const u = new URL(url.trim());
        return (u.protocol === 'https:' || u.protocol === 'http:') && u.hostname.length > 0;
    } catch {
        return false;
    }
};