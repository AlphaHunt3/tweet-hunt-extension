/**
 * 净化功能页面过滤工具
 *
 * 某些页面无需执行推文净化检测与 DOM 监听（例如私信聊天、Grok 对话、创作者工作室、系统设置等）。
 * 在感知到这些页面时，停止 DOM 监听与检测，降低不必要的 CPU 开销与误处理。
 *
 * 注意：
 * 1. 推特 Lists（例如 /i/lists/:id 或 /:username/lists）属于推文信息流，绝不可被排除。
 * 2. 通知页（/notifications）必须正常监听，以净化其中的骚扰回复与提到；但对本人推文被点赞/转推的通知需特殊豁免。
 */

// 已知无需执行推文净化的独立顶级路径（忽略大小写，匹配第一段路径）
const IGNORED_FIRST_SEGMENTS = new Set([
  'messages',      // 私信消息页（https://x.com/messages 及各会话）
  'grok',          // Grok 对话页（https://x.com/grok）
  'settings',      // 设置页面（https://x.com/settings 及 /settings/account 等所有子页面）
  'creator_studio',// 创作者工作室
  'creator-studio',// 创作者工作室（连字符形态）
  'monetization',  // 变现页面
  'analytics',     // 数据分析
  'jobs',          // 招聘页
  'logout',        // 登出页
  'account',       // 账户系统页
  'compose',       // 发推弹窗/独立页
]);

// /i/ 内部子路由中无需推文净化的第二段路径
const IGNORED_I_SECOND_SEGMENTS = new Set([
  'chat',                    // 私信聊天（https://x.com/i/chat 及聊天会话）
  'grok',                    // Grok 对话（https://x.com/i/grok）
  'jf',                      // 创作者中心（https://x.com/i/jf/creators/studio 等）
  'creator_studio',          // 创作者工作室（https://x.com/i/creator_studio）
  'creator-studio',          // 创作者工作室（连字符形态）
  'monetization',            // 创作者变现（https://x.com/i/monetization）
  'analytics',               // 数据分析（https://x.com/i/analytics）
  'settings',                // 设置（https://x.com/i/settings 及子项）
  'premium',                 // Premium 订阅页
  'premium_sign_up',         // Premium 注册页
  'verified-orgs-signup',    // 认证机构订阅页
  'spaces',                  // Spaces 音频空间
  'display',                 // 显示设置（夜间模式/字体等）
  'keyboard_shortcuts',      // 快捷键列表
  'flow',                    // 登录/注册/验证等流程页
  'drafts',                  // 草稿箱
  'safety',                  // 安全设置
  'audit',                   // 审计
  'connect_people',          // 推荐关注流
]);

/**
 * 判断给定的 URL 是否属于通知页面（https://x.com/notifications 及各子标签）
 */
export function isNotificationUrl(urlInput?: string): boolean {
  const rawUrl =
    urlInput || (typeof window !== 'undefined' ? window.location?.href : '');
  if (!rawUrl) return false;

  try {
    const baseOrigin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://x.com';
    const parsed = new URL(rawUrl, baseOrigin);
    const segments = parsed.pathname
      .replace(/^\/+|\/+$/g, '')
      .split('/')
      .filter(Boolean);
    return segments[0]?.toLowerCase() === 'notifications';
  } catch {
    return false;
  }
}

/**
 * 判断给定的 URL 是否属于无需进行推文净化检测的页面。
 *
 * @param urlInput 待检测的完整 URL、相对路径或省略（省略时默认使用当前页面 window.location.href）
 * @returns true 表示该页面不需要黄推净化检测，应停止 DOM 监听；false 表示需要检测
 */
export function isCleanerIgnoredUrl(urlInput?: string): boolean {
  const rawUrl =
    urlInput || (typeof window !== 'undefined' ? window.location?.href : '');
  if (!rawUrl) return false;

  try {
    const baseOrigin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://x.com';
    const parsed = new URL(rawUrl, baseOrigin);
    const hostname = parsed.hostname.toLowerCase();

    // 针对独立二级域名（如 studio.x.com, analytics.x.com, ads.x.com）直接忽略
    if (
      hostname.startsWith('studio.') ||
      hostname.startsWith('analytics.') ||
      hostname.startsWith('ads.') ||
      hostname.startsWith('developer.')
    ) {
      return true;
    }

    // 仅针对 Twitter / X 域名进行检测；非推特域名直接跳过
    if (
      hostname !== 'x.com' &&
      hostname !== 'twitter.com' &&
      !hostname.endsWith('.x.com') &&
      !hostname.endsWith('.twitter.com')
    ) {
      return true;
    }

    const segments = parsed.pathname
      .replace(/^\/+|\/+$/g, '')
      .split('/')
      .filter(Boolean)
      .map((s) => s.toLowerCase());

    // 根路径 https://x.com/ 即首页时间线，必须检测
    if (segments.length === 0) {
      return false;
    }

    const first = segments[0];

    // 1. 匹配已知无需检测的独立顶级路由
    if (IGNORED_FIRST_SEGMENTS.has(first)) {
      return true;
    }

    // 2. 匹配 /i/ 内部子路由
    if (first === 'i') {
      const second = segments[1] || '';
      if (IGNORED_I_SECOND_SEGMENTS.has(second)) {
        return true;
      }
      return false;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * 判断当前页面是否需要执行推文净化
 */
export function shouldCleanUrl(urlInput?: string): boolean {
  return !isCleanerIgnoredUrl(urlInput);
}

/**
 * 检查推文节点是否属于“别人对用户本人推文的互动通知”（例如：别人点赞/转推/喜欢了用户的帖子）。
 * 此类通知卡片中展示的正文属于用户本人所发内容，绝不能作为垃圾推文/黄推进行误拦截或打标。
 *
 * 安全约束：该豁免仅且必须在通知页面（/notifications/*）中生效，避免垃圾推文在首页信息流利用同名文案绕过拦截。
 */
export function isNotificationInteractionOnOwnPost(
  article: HTMLElement,
  currentUrl?: string
): boolean {
  if (!article) return false;

  // 安全前置校验：仅在通知页生效，避免首页等其他推文流被同名文本投毒规避净化
  if (!isNotificationUrl(currentUrl)) {
    return false;
  }

  const textContent = article.textContent || '';
  if (!textContent) return false;

  const interactionPatterns = [
    // 中文：点赞 / 赞 / 喜欢 / 转推 / 转帖了你的帖子/推文/回复
    /(?:点赞|赞|喜欢|转推|转帖)了你(?:的|被提及的)?(?:帖子|回复|推文)?/,
    // 英文：liked / reposted / retweeted your post / reply / tweet
    /(?:liked|reposted|retweeted) (?:your|a (?:post|tweet) you were mentioned in)/i,
    // 日文：いいね / リポスト
    /あなたの(?:ポスト|返信).*(?:「いいね」しました|リポストしました)/,
    // 西班牙文：le gustó / reposteó
    /(?:le gustó|reposteó|ha retweeteado) tu/i,
  ];

  for (const pattern of interactionPatterns) {
    if (pattern.test(textContent)) {
      return true;
    }
  }

  return false;
}
