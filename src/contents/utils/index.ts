export const config = {
  matches: ['https://x.com/*']
}

/**
 * 从给定的 URL 中提取用户名
 * @param url - 完整的 URL 字符串，例如 "https://x.com/aixbt_agent"
 * @returns 提取的用户名，如果无法提取或域名不是 x.com 或是导航页则返回空字符串
 */
export function extractUsernameFromUrl(url: string): string {
  try {
    // 使用 URL 构造函数解析 URL
    const parsedUrl = new URL(url);

    // 检查域名是否为 x.com
    if (parsedUrl.hostname !== 'x.com') {
      return '';
    }

    // 获取路径部分（去掉开头的斜杠）
    const path = parsedUrl.pathname;

    // 去掉路径开头的斜杠并分割路径
    const segments = path.split('/').filter(segment => segment.length > 0);

    // 定义已知的导航页面路径（黑名单）
    const navigationPages = new Set([
      'home',          // 首页
      'explore',       // 探索页
      'notifications', // 通知页
      'messages',      // 消息页
      'search',        // 搜索页
      'settings',      // 设置页
      'i',             // 内部页面（如设置子页面）
    ]);

    // 如果路径的第一个部分是导航页面，则返回空字符串
    const firstSegment = segments[0];
    if (navigationPages.has(firstSegment)) {
      return '';
    }

    // 返回路径的第一个有效部分作为用户名
    return firstSegment || '';
  } catch (error) {
    // 如果 URL 格式无效，捕获错误并返回空字符串
    console.error('Invalid URL:', error);
    return '';
  }
}
