import numeral from 'numeral';
import packageJson from '../../../package.json';
import { localSupportedTokens } from '~contents/utils/tokens.ts';

export const config = {
  matches: ['https://x.com/*'],
};

const path1Arg = [
  'with_replies',
  'highlights',
  'media',
  'superfollows',
  'photo',
  'verified_followers',
  'followers_you_follow',
  'followers',
  'following',
  'affiliates',
  'articles',
];

// 定义已知的导航页面路径（黑名单）
const navigationPages = new Set([
  'home', // 首页
  'explore', // 探索页
  'notifications', // 通知页
  'messages', // 消息页
  'search', // 搜索页
  'settings', // 设置页
  'i', // 内部页面（如设置子页面）
  'logout', // 登出
  'compose', // 创建新推文
  'status', // 状态页
  'with_replies', // 回复
  'articles', // 文章
  'jobs', // 招聘
]);

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
    const segments = path.split('/').filter((segment) => segment.length > 0);

    if ((segments || [])?.length > 1 && !path1Arg.includes(segments[1])) {
      return '';
    }

    // 如果路径的第一个部分是导航页面，则返回空字符串
    const firstSegment = segments[0];
    if (navigationPages.has(firstSegment)) {
      return '';
    }

    // 返回路径的第一个有效部分作为用户名
    return firstSegment || '';
  } catch (error) {
    // 如果 URL 格式无效，捕获错误并返回空字符串
    console.log('Invalid URL:', error);
    return '';
  }
}

export function extractStatusIdFromUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname !== 'x.com') {
      return '';
    }
    const segments = parsedUrl.pathname
      .split('/')
      .filter((segment) => segment.length > 0);
    const statusIndex = segments.indexOf('status');
    if (statusIndex === -1) return '';
    const candidate = segments[statusIndex + 1] || '';
    if (!/^[0-9]+$/.test(candidate)) return '';
    return candidate;
  } catch (error) {
    console.log('Invalid URL:', error);
    return '';
  }
}

export const formatPercentage = (num: number | null | undefined) => {
  if (!num) return 'N/A';
  return numeral(num).format('0.0%');
};

export const formatNumber = (num: number) => {
  return numeral(num).format('0.[0]a').toUpperCase();
};

export const formatFunding = (amount: number) => {
  return String(numeral(amount).format('$0.0a')).toLocaleUpperCase();
};

/**
 * 判断用户是否使用中文
 * @returns {boolean} 如果用户的语言设置为中文，返回 true；否则返回 false。
 */
export function isUserUsingChinese() {
  // 获取首选语言 (兼容旧版浏览器)
  const preferredLanguage = navigator.language || 'en';

  // 获取所有语言偏好 (兼容旧版浏览器)
  const languagePreferences = Array.isArray(navigator.languages)
    ? navigator.languages
    : [preferredLanguage];

  // 检测是否包含中文语言代码
  return languagePreferences.some((lang) => /^zh/i.test(lang));
}

export function getMBTIColor(mbti: string) {
  const colors: { [key: string]: string } = {
    ENTJ: 'text-purple-400',
    INTJ: 'text-blue-400',
    ENTP: 'text-green-400',
    INTP: 'text-yellow-400',
    ENFJ: 'text-pink-400',
    INFJ: 'text-red-400',
    ENFP: 'text-orange-400',
    INFP: 'text-teal-400',
  };
  return colors[mbti] || 'text-blue-400';
}

export function openNewTab(url: string) {
  const win = window.open(url, '_blank');
  if (!win || win.closed) {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer'; // 安全设置
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

export type URLParams = {
  [key: string]: string | string[];
};

/**
 * 解析 URL 查询参数为对象
 *
 * @param url - 包含查询参数的完整 URL 或仅查询字符串部分
 * @returns 解析后的参数对象
 */
export function parseURLParams(url: string): URLParams {
  // 提取查询字符串部分
  const queryString = url.split('?')[1] || url;

  // 创建 URLSearchParams 对象
  const params = new URLSearchParams(queryString);
  const result: URLParams = {};

  for (const [key, value] of params.entries()) {
    if (!result[key]) {
      // 第一次出现，直接赋值
      result[key] = value;
    } else {
      const existingValue = result[key];
      if (Array.isArray(existingValue)) {
        // 已是数组，push 新值
        existingValue.push(value);
      } else {
        // 首次重复，转为数组
        result[key] = [existingValue, value];
      }
    }
  }

  return result;
}

/**
 * 计算标签字符长度（中文按 4 字符计算）
 */
export function calculateTagCharLength(tag: string) {
  if (typeof tag !== 'string') return 0;
  let length = 0;
  for (let i = 0; i < tag.length; i++) {
    const charCode = tag.charCodeAt(i);
    // 判断是否是汉字或宽字符（CJK Unicode）
    if (
      (charCode >= 0x4e00 && charCode <= 0x9fa5) || // 中文
      charCode === 0x300c ||
      charCode === 0x300d || // 「」
      charCode === 0x300e ||
      charCode === 0x300f || // 《》
      charCode === 0x3010 ||
      charCode === 0x3011
    ) {
      // 【】
      length += 4;
    } else if (charCode > 127 || charCode === 94) {
      // 其他宽字符或 ^
      length += 2;
    } else {
      length += 1;
    }
  }
  return length;
}

/** 匹配文本中的所有ticker或者CA **/
export function extractTickerOrCA(text: string): string[] {
  if (!text) return [];
  if (localSupportedTokens.has(String(text).toLowerCase())) {
    return [`$${String(text).toLowerCase()}`];
  }
  // 预检：快速排除不可能匹配的内容
  if (!text.includes('$') && !text.includes('0x') && !text.includes('bc1')) {
    return [];
  }

  const matches: string[] = [];

  // Match $ticker（宽松边界：遇到非字母数字或结尾）
  const tickerRegex = /\$[a-zA-Z][a-zA-Z0-9]*(?=[^a-zA-Z0-9]|$)/g;
  let match;
  while ((match = tickerRegex.exec(text)) !== null) {
    matches.push(match[0]);
  }

  // Match Ethereum address
  const ethRegex = /\b0x[a-fA-F0-9]{40}\b/g;
  while ((match = ethRegex.exec(text)) !== null) {
    matches.push(match[0]);
  }

  // Match Solana address
  const solRegex = /\b[1-9A-HJ-NP-Za-km-z]{43,44}\b/g;
  while ((match = solRegex.exec(text)) !== null) {
    matches.push(match[0]);
  }

  // Match Bitcoin address
  const btcRegex =
    /\b([13][a-km-zA-HJ-NP-Z0-9]{25,34}|bc1[ac-hdefgprsqstuvwxyz023456789]{6,62})\b/gi;
  while ((match = btcRegex.exec(text)) !== null) {
    matches.push(match[0]);
  }

  return matches;
}

/** 自定义谷歌统计 **/
export function windowGtag(type: string, eventName: string, params: any = {}) {}

// 🆕 安全的 Chrome Runtime 消息发送
export function safeSendMessage(message: any): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      // 检查扩展上下文
      if (!checkExtensionContext()) {
        reject(new Error('Extension context invalidated'));
        return;
      }

      // 发送消息
      chrome.runtime.sendMessage(message, (response: any) => {
        // 检查是否有运行时错误
        if ((chrome.runtime as any).lastError) {
          const error = (chrome.runtime as any).lastError;
          console.log(`[v${packageJson.version}] Chrome runtime error:`, error);

          // 如果是上下文失效错误，抛出特定错误
          if (
            error &&
            error?.message &&
            error.message.includes('Extension context invalidated')
          ) {
            reject(response || undefined);
          } else {
            reject(response || undefined);
          }
          return;
        }

        resolve(response || { data: { success: true } });
      });
    } catch (error) {
      console.log(`[v${packageJson.version}] Failed to send message:`, error);
      reject(error);
    }
  });
}

export function checkExtensionContext(): boolean {
  // 🆕 检查扩展上下文是否有效
  try {
    if (typeof chrome === 'undefined') {
      return false;
    }
    if (!chrome.runtime || !chrome.runtime.id) {
      return false;
    }
    // 尝试访问 runtime.getManifest，如果失败说明上下文无效
    chrome.runtime.getManifest();
    return true;
  } catch (error) {
    console.log(
      `[v${packageJson.version}] Extension context check failed:`,
      error
    );
    return false;
  }
}
