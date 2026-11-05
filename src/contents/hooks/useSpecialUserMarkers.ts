import { useEffect, useCallback, useRef } from 'react';
import { subscribeToMutation } from './useGlobalMutationObserver';
import { subscribeToScroll } from './useGlobalScroll';
import useFetchTwId from './useFetchTwId';
import useCurrentUrl from './useCurrentUrl';
import { useI18n } from './i18n';
import { extractUsernameFromUrl } from '~contents/utils';
import { specialMarkersManager } from '~utils/specialMarkersManager';
import type { SpecialMarkerItem } from '~types';
import specialMarkersCss from 'data-text:~/css/special-markers.css';

// 标记 tooltip 文案（createSpecialMarkerNode 为纯 DOM 函数无法调用 hook，
// 由 useSpecialUserMarkers 内根据当前语言更新此模块级副本）
const markerI18nLabels = {
  lang: 'zh',
  reason: '原因/说明',
  clickEvidence: '点击查看证据或公示链接',
};

function getMarkerDisplayText(marker: SpecialMarkerItem): string {
  if (markerI18nLabels.lang === 'en' && marker.textEn) {
    return marker.textEn;
  }
  return marker.text;
}

const RESERVED_PATHS = new Set([
  'home',
  'explore',
  'notifications',
  'messages',
  'bookmarks',
  'i',
  'settings',
  'search',
  'tos',
  'privacy',
  'compose',
]);

/**
 * 判断当前页面是否为 /i/chat/ 页面
 */
function isChatPage(urlInput?: string): boolean {
  if (typeof window === 'undefined') return false;
  let pathname = window.location.pathname;
  if (urlInput) {
    try {
      pathname = new URL(urlInput, window.location.origin).pathname;
    } catch (_) {
      return false;
    }
  }
  const normalizedPathname = pathname.toLowerCase();
  return (
    normalizedPathname === '/i/chat' ||
    normalizedPathname.startsWith('/i/chat/')
  );
}

function normalizeUsername(value?: string | null): string {
  return String(value || '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase();
}

/**
 * 将 newNode 插入到 referenceNode 之后
 */
function ensureStylesInRoot(root: Document | ShadowRoot) {
  try {
    if (root.querySelector('#xhunt-special-markers-style')) return;
    const styleHost = root instanceof Document ? root.head || root.documentElement : root;
    if (!styleHost) return;
    const doc = root instanceof Document ? root : root.ownerDocument;
    const style = doc.createElement('style');
    style.setAttribute('id', 'xhunt-special-markers-style');
    style.textContent = specialMarkersCss;
    styleHost.appendChild(style);
  } catch (_) {}
}

function ensureSpecialMarkerStyles(element: HTMLElement) {
  const root = element.getRootNode();
  ensureStylesInRoot(
    root instanceof Document || root instanceof ShadowRoot
      ? root
      : element.ownerDocument || document,
  );
}

function insertAfter(newNode: Node, referenceNode: Node) {
  if (referenceNode.nextSibling) {
    referenceNode.parentNode?.insertBefore(newNode, referenceNode.nextSibling);
  } else {
    referenceNode.parentNode?.appendChild(newNode);
  }
}

/**
 * 从推文节点提取作者真实 handle
 */
function extractTweetHandle(userNameEl: HTMLElement): string {
  const links = userNameEl.querySelectorAll<HTMLAnchorElement>('a[href]');
  for (const link of links) {
    if (link.closest('.xhunt-special-marker')) continue;
    const href = link.getAttribute('href') || '';
    const match = href.match(/^\/([a-zA-Z0-9_]+)(?:\/)?$/);
    if (match) {
      const candidate = match[1].toLowerCase();
      if (!RESERVED_PATHS.has(candidate)) {
        return candidate;
      }
    }
  }

  const spans = userNameEl.querySelectorAll('span');
  for (const span of spans) {
    if (span.closest('.xhunt-special-marker')) continue;
    const text = (span.textContent || '').trim();
    if (/^@[a-zA-Z0-9_]+$/.test(text)) {
      return text.slice(1).toLowerCase();
    }
  }

  return '';
}

/**
 * 从个人主页 URL 中提取当前 profile 用户名
 */
function extractProfileHandleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length >= 1) {
      const candidate = parts[0].toLowerCase();
      if (!RESERVED_PATHS.has(candidate)) {
        return candidate;
      }
    }
  } catch (_) {}
  return '';
}

/**
 * 从私信会话节点 (conversation) 中提取对方 handle
 */
function extractConversationHandle(conversationEl: HTMLElement): string {
  const spans = conversationEl.querySelectorAll('span');
  for (const span of spans) {
    if (span.closest('.xhunt-special-marker')) continue;
    const text = (span.textContent || '').trim();
    if (/^@[a-zA-Z0-9_]+$/.test(text)) {
      return text.slice(1).toLowerCase();
    }
  }

  const links = conversationEl.querySelectorAll<HTMLAnchorElement>('a[href]');
  for (const link of links) {
    if (link.closest('.xhunt-special-marker')) continue;
    const href = link.getAttribute('href') || '';
    const match = href.match(/^\/([a-zA-Z0-9_]+)(?:\/)?$/);
    if (match && !RESERVED_PATHS.has(match[1].toLowerCase())) {
      return match[1].toLowerCase();
    }
  }
  return '';
}

/**
 * 在推文中定位标记挂载点：
 * 1. 帖子列表 (Timeline / Feed):
 *    userNameEl 本身具有 r-18u37iz 水平行 flex 容器，子项为 [DisplayName, Handle, ·, Date]
 *    标记放在最后（日期后面），全部在同一水平行。
 * 2. 单篇帖子详情页 (Single Tweet Detail):
 *    userNameEl 为垂直 flex 列容器（不含 r-18u37iz）：
 *    Child 0: DisplayName
 *    Child 1: Handle row (带有 r-18u37iz 水平行 flex)
 *    标记精准放入 Handle row 内紧跟在 @handle 后面，绝不换行掉到第3行！
 */
function resolveTweetPlacement(
  userNameEl: HTMLElement,
  handle: string,
): {
  targetContainer: HTMLElement;
  anchorElement: HTMLElement | null;
  mode: 'after' | 'append';
} {
  const isHorizontalRow = userNameEl.classList.contains('r-18u37iz');

  if (isHorizontalRow) {
    // 场景 A: 帖子列表（Timeline） -> 放在最后（日期后面同一行）
    let lastContentChild: HTMLElement | null = null;
    for (let i = 0; i < userNameEl.children.length; i++) {
      const child = userNameEl.children[i] as HTMLElement;
      if (!child.classList.contains('xhunt-special-marker')) {
        lastContentChild = child;
      }
    }
    return {
      targetContainer: userNameEl,
      anchorElement: lastContentChild,
      mode: lastContentChild ? 'after' : 'append',
    };
  }

  // 场景 B: 单篇帖子详情页 -> 放入 handle 所在水平行 (r-18u37iz)，紧跟在 @handle 后面
  let handleRow: HTMLElement | null = null;
  let handleChild: HTMLElement | null = null;

  const targetText = `@${handle.toLowerCase()}`;
  const links = userNameEl.querySelectorAll<HTMLAnchorElement>('a[href]');
  for (const link of links) {
    if (link.closest('.xhunt-special-marker')) continue;
    const text = (link.textContent || '').trim().toLowerCase();
    if (text === targetText || text.startsWith('@')) {
      let curr: HTMLElement = link;
      while (
        curr.parentElement &&
        curr.parentElement !== userNameEl &&
        curr.parentElement.parentElement !== userNameEl
      ) {
        curr = curr.parentElement;
      }
      if (
        curr.parentElement &&
        curr.parentElement.parentElement === userNameEl
      ) {
        handleChild = curr;
        handleRow = curr.parentElement;
      } else if (curr.parentElement === userNameEl) {
        handleRow = curr;
        handleChild = link;
      }
      break;
    }
  }

  if (!handleRow && userNameEl.children.length > 1) {
    const candidate = userNameEl.children[1] as HTMLElement;
    if (!candidate.classList.contains('xhunt-special-marker')) {
      handleRow = candidate;
      handleChild = (candidate.firstElementChild as HTMLElement) || candidate;
    }
  }

  if (!handleRow) {
    handleRow = userNameEl;
    handleChild = (userNameEl.firstElementChild as HTMLElement) || null;
  }

  return {
    targetContainer: handleRow,
    anchorElement: handleChild,
    mode: handleChild && handleChild !== handleRow ? 'after' : 'append',
  };
}

/**
 * 辅助：在 userNameEl 区域内精确或模糊匹配代表 handle 的元素
 */
function findProfileHandleElement(
  userNameEl: HTMLElement,
  cleanUser: string,
): HTMLElement | null {
  const targetText = cleanUser ? `@${cleanUser}` : '';

  // 1. 精确匹配包含 @cleanUser 的 span 或 a
  if (targetText) {
    const elements = userNameEl.querySelectorAll<HTMLElement>('span, a');
    for (const el of elements) {
      if (el.closest('.xhunt-special-marker')) continue;
      const t = (el.textContent || '').trim().toLowerCase();
      if (t === targetText || t === cleanUser) {
        return el;
      }
    }
  }

  // 2. 匹配以 @ 开头的 span 或 a (排除保留路径)
  const elements = userNameEl.querySelectorAll<HTMLElement>('span, a');
  for (const el of elements) {
    if (el.closest('.xhunt-special-marker')) continue;
    const t = (el.textContent || '').trim().toLowerCase();
    if (t.startsWith('@') && t.length > 1) {
      const candidate = t.slice(1);
      if (!RESERVED_PATHS.has(candidate)) {
        return el;
      }
    }
  }

  // 3. 匹配包含 @[a-zA-Z0-9_]+ 的最深层节点
  for (const el of elements) {
    if (el.closest('.xhunt-special-marker')) continue;
    const t = (el.textContent || '').trim();
    if (/@([a-zA-Z0-9_]+)/.test(t)) {
      return el;
    }
  }

  return null;
}

/**
 * 在个人主页 (Profile Header) 定位标记挂载点：
 * User-Name 为垂直 flex 列容器：
 * Child 0: DisplayName (Mirae)
 * Child 1: Handle row (包含 @MiraeVenture 与 备注 按钮，带有 r-18u37iz 水平 flex)
 * 需求：精准挂载在 Handle row 内紧跟在 @handle 后面，全在一行水平展示，绝不下沉换行到第3行！
 */
function resolveProfilePlacement(
  userNameEl: HTMLElement,
  handle: string,
): {
  targetContainer: HTMLElement;
  anchorElement: HTMLElement | null;
  mode: 'after' | 'append';
} {
  const cleanHandle = normalizeUsername(handle);
  const handleEl = findProfileHandleElement(userNameEl, cleanHandle);

  let targetContainer: HTMLElement | null = null;
  let anchorElement: HTMLElement | null = null;

  if (handleEl) {
    // 向上寻找位于 userNameEl 内部且包含 r-18u37iz 的水平行容器（取最高级水平行，即 Handle 整行）
    let highestHorizontalRow: HTMLElement | null = null;
    let curr: HTMLElement | null = handleEl;
    while (curr && curr !== userNameEl) {
      if (curr.classList.contains('r-18u37iz')) {
        highestHorizontalRow = curr;
      }
      curr = curr.parentElement;
    }

    if (highestHorizontalRow) {
      targetContainer = highestHorizontalRow;
    } else {
      // 若未找到 r-18u37iz，取 userNameEl 下包含 handleEl 的直接分支
      let branch: HTMLElement | null = handleEl;
      while (
        branch &&
        branch.parentElement &&
        branch.parentElement !== userNameEl
      ) {
        branch = branch.parentElement;
      }
      if (branch && branch.parentElement === userNameEl) {
        targetContainer = branch;
      }
    }

    // 在 targetContainer 内找到包含 handleEl 的直接子元素作为锚点
    if (targetContainer) {
      let child: HTMLElement | null = handleEl;
      while (
        child &&
        child.parentElement &&
        child.parentElement !== targetContainer
      ) {
        child = child.parentElement;
      }
      if (child && child.parentElement === targetContainer) {
        anchorElement = child;
      }
    }
  }

  // 保底策略：若 handleEl 没定位到，寻找包含 r-18u37iz 的子项，优先取第 2 个直接子项（Handle 行）
  if (!targetContainer && userNameEl.children.length > 1) {
    const secondChild = userNameEl.children[1] as HTMLElement;
    if (!secondChild.classList.contains('xhunt-special-marker')) {
      const nestedRow = secondChild.classList.contains('r-18u37iz')
        ? secondChild
        : secondChild.querySelector<HTMLElement>('.r-18u37iz') || secondChild;
      targetContainer = nestedRow;
      anchorElement = (nestedRow.firstElementChild as HTMLElement) || null;
    }
  }

  // 终极保底：第 1 个子元素内部，绝不挂在 userNameEl 顶层换行下沉
  if (!targetContainer) {
    targetContainer =
      (userNameEl.firstElementChild as HTMLElement) || userNameEl;
    anchorElement = (targetContainer.firstElementChild as HTMLElement) || null;
  }

  return {
    targetContainer,
    anchorElement,
    mode:
      anchorElement && anchorElement !== targetContainer ? 'after' : 'append',
  };
}

/**
 * 生成微型矢量 SVG 图标
 */
function createMarkerIconSvg(icon: string, ownerDoc: Document = document): SVGElement | null {
  if (!icon || icon === 'none') return null;

  const svg = ownerDoc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2.2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('width', '12');
  svg.setAttribute('height', '12');
  svg.classList.add('xhunt-special-marker-icon');

  svg.style.width = '12px';
  svg.style.height = '12px';
  svg.style.minWidth = '12px';
  svg.style.maxWidth = '12px';
  svg.style.minHeight = '12px';
  svg.style.maxHeight = '12px';
  svg.style.flexShrink = '0';
  svg.style.display = 'inline-block';
  svg.style.verticalAlign = 'middle';

  const path = ownerDoc.createElementNS('http://www.w3.org/2000/svg', 'path');

  switch (icon) {
    case 'shield-alert':
      path.setAttribute(
        'd',
        'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zm0-13v4m0 4h.01',
      );
      break;
    case 'alert-triangle':
      path.setAttribute(
        'd',
        'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3ZM12 9v4m0 4h.01',
      );
      break;
    case 'shield-check':
      path.setAttribute(
        'd',
        'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zm-3-10 2 2 4-4',
      );
      break;
    case 'badge-check':
      path.setAttribute(
        'd',
        'm9 12 2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
      );
      break;
    case 'skull':
      path.setAttribute(
        'd',
        'm12.5 17-.5-1-.5 1m-3.5 0h8M9 10h.01M15 10h.01M17 14c.7-1 1-2.2 1-3.5 0-3.6-2.7-6.5-6-6.5s-6 2.9-6 6.5c0 1.3.3 2.5 1 3.5v3h10v-3Z',
      );
      break;
    case 'flame':
      path.setAttribute(
        'd',
        'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z',
      );
      break;
    case 'crown':
      path.setAttribute('d', 'm2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14');
      break;
    case 'bot':
      path.setAttribute(
        'd',
        'M12 8V4H8m4 4h4V4M4 14a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4zm5-1v2m6-2v2',
      );
      break;
    case 'ban':
      path.setAttribute(
        'd',
        'm4.9 4.9 14.2 14.2M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0Z',
      );
      break;
    case 'zap':
      path.setAttribute('d', 'M13 2 3 14h9l-1 8 10-12h-9l1-8z');
      break;
    default:
      return null;
  }

  svg.appendChild(path);
  return svg;
}

/**
 * 组装生成特殊标记 DOM 节点
 * 默认缩放 0.9，居中缩放，位置微调
 */
function createSpecialMarkerNode(
  marker: SpecialMarkerItem,
  username: string,
  ownerDoc: Document = document,
): HTMLElement {
  const displayText = getMarkerDisplayText(marker);
  const badge = ownerDoc.createElement('span');
  const variantClass = `xhunt-variant-${marker.variant || 'subtle'}`;
  const colorClass = `xhunt-marker-${marker.color || 'danger-red'}`;
  const effectClass = marker.effect === 'pulse' ? 'xhunt-effect-pulse' : '';

  badge.className =
    `xhunt-special-marker ${colorClass} ${variantClass} ${effectClass}`.trim();
  badge.setAttribute('data-xhunt-marker-node', 'true');
  badge.setAttribute('data-xhunt-marker-user', username);
  badge.setAttribute('data-xhunt-marker-text', displayText);
  badge.setAttribute('data-xhunt-marker-color', marker.color || 'danger-red');
  badge.setAttribute('data-xhunt-marker-variant', marker.variant || 'subtle');
  badge.setAttribute('data-xhunt-marker-effect', marker.effect || '');
  badge.setAttribute('data-xhunt-marker-icon', marker.icon || '');
  badge.setAttribute('role', 'status');

  badge.style.display = 'inline-flex';
  badge.style.alignItems = 'center';
  badge.style.alignSelf = 'center';
  badge.style.verticalAlign = 'middle';
  badge.style.whiteSpace = 'nowrap';
  badge.style.flexShrink = '0';
  badge.style.transform = 'scale(0.9)';
  badge.style.transformOrigin = 'center center';
  badge.style.marginLeft = '4px';
  badge.style.marginRight = '4px';
  badge.style.lineHeight = '1';
  badge.style.height = 'fit-content';
  badge.style.cursor = 'pointer';

  // 构建 Hover 说明
  const tooltipLines: string[] = [`【${displayText}】`];
  if (marker.desc) {
    tooltipLines.push(`${markerI18nLabels.reason}: ${marker.desc}`);
  }
  if (marker.link) {
    tooltipLines.push(markerI18nLabels.clickEvidence);
  }
  badge.setAttribute('title', tooltipLines.join('\n'));
  badge.setAttribute('aria-label', `${displayText} @${username}`);

  // 微型 SVG 图标
  if (marker.icon && marker.icon !== 'none') {
    const iconSvg = createMarkerIconSvg(marker.icon, ownerDoc);
    if (iconSvg) {
      badge.appendChild(iconSvg);
    }
  }

  // 文本
  const textSpan = ownerDoc.createElement('span');
  textSpan.className = 'xhunt-special-marker-text';
  textSpan.textContent = displayText;
  textSpan.style.fontSize = '11px';
  textSpan.style.lineHeight = '1';
  textSpan.style.whiteSpace = 'nowrap';
  badge.appendChild(textSpan);

  // 拦截冒泡，避免误触 Twitter 原生推文/会话跳转
  const stopProp = (e: Event) => {
    e.stopPropagation();
    e.stopImmediatePropagation();
  };
  badge.addEventListener('mousedown', stopProp, true);
  badge.addEventListener('pointerdown', stopProp, true);
  badge.addEventListener('mouseup', stopProp, true);

  badge.addEventListener(
    'click',
    (e: MouseEvent) => {
      stopProp(e);
      if (marker.link) {
        window.open(marker.link, '_blank', 'noopener,noreferrer');
      }
    },
    true,
  );

  return badge;
}

/**
 * 核心防闪与幂等挂载函数：
 * 1. 查找挂载容器直属 direct child (:scope > .xhunt-special-marker)。
 * 2. 若数据未变且位置正确，严格 0 操作（不删除、不重新插入，杜绝任何视觉闪烁）！
 * 3. 只有数据变动或节点缺失时才进行更新。
 */
function attachBadgeSafely(
  scopeContainer: HTMLElement,
  anchorElement: HTMLElement | null,
  username: string,
  mode: 'after' | 'append' = 'after',
) {
  const cleanUser = normalizeUsername(username);
  const ownerDoc = scopeContainer.ownerDocument || document;
  ensureSpecialMarkerStyles(scopeContainer);

  const existingBadge = scopeContainer.querySelector<HTMLElement>(
    ':scope > .xhunt-special-marker[data-xhunt-marker-node="true"]',
  );

  const marker = cleanUser ? specialMarkersManager.getMarker(cleanUser) : null;

  if (!marker) {
    if (existingBadge) existingBadge.remove();
    delete scopeContainer.dataset.xhuntSpecialMarkerUser;
    scopeContainer.dataset.xhuntSpecialMarkerHandled = 'true';
    return;
  }

  const displayText = getMarkerDisplayText(marker);
  if (
    existingBadge &&
    existingBadge.getAttribute('data-xhunt-marker-user') === cleanUser &&
    existingBadge.getAttribute('data-xhunt-marker-text') === displayText &&
    existingBadge.getAttribute('data-xhunt-marker-color') ===
      (marker.color || 'danger-red') &&
    existingBadge.getAttribute('data-xhunt-marker-variant') ===
      (marker.variant || 'subtle') &&
    existingBadge.getAttribute('data-xhunt-marker-effect') ===
      (marker.effect || '') &&
    existingBadge.getAttribute('data-xhunt-marker-icon') === (marker.icon || '')
  ) {
    // 检查位置是否需要微调，确保位于正确的直接子节点后面或末尾
    if (mode === 'after' && anchorElement) {
      let directChild: HTMLElement | null = anchorElement;
      while (directChild && directChild.parentElement !== scopeContainer) {
        directChild = directChild.parentElement;
      }
      if (directChild && directChild.nextSibling !== existingBadge) {
        insertAfter(existingBadge, directChild);
      }
    }
    scopeContainer.dataset.xhuntSpecialMarkerHandled = 'true';
    scopeContainer.dataset.xhuntSpecialMarkerUser = cleanUser;
    return;
  }

  if (existingBadge) {
    existingBadge.remove();
  }

  const badgeNode = createSpecialMarkerNode(marker, cleanUser, ownerDoc);
  scopeContainer.dataset.xhuntSpecialMarkerUser = cleanUser;
  scopeContainer.dataset.xhuntSpecialMarkerHandled = 'true';

  if (mode === 'append' || !anchorElement || anchorElement === scopeContainer) {
    scopeContainer.appendChild(badgeNode);
  } else {
    let directChild: HTMLElement | null = anchorElement;
    while (directChild && directChild.parentElement !== scopeContainer) {
      directChild = directChild.parentElement;
    }
    if (directChild) {
      insertAfter(badgeNode, directChild);
    } else {
      scopeContainer.appendChild(badgeNode);
    }
  }
}

// =============================================================================
// 各业务区域的原子处理逻辑（支持虚拟滚动回收节点的精确响应与 0 重绘幂等）
// =============================================================================

/**
 * 处理单条推文作者节点 (article div[data-testid="User-Name"])
 */
function processTweetUserName(userNameEl: HTMLElement) {
  if (!userNameEl.isConnected) return;
  if (isChatPage()) return;
  if (userNameEl.getAttribute('data-testid') === 'UserName') return;

  const currentAuthor = extractTweetHandle(userNameEl);
  if (!currentAuthor) {
    // 标记为 empty，防止在未识别 handle 的占位节点上被滚动监听无休止重复计算
    userNameEl.dataset.xhuntSpecialMarkerHandled = 'empty';
    return;
  }

  const hasMarker = specialMarkersManager.hasMarker(currentAuthor);
  const hasExistingMarker = Boolean(
    userNameEl.querySelector('.xhunt-special-marker'),
  );

  // 1. 绝大多数推文作者既无标记也无残留 DOM，直接短路标记为已处理，跳过 placement 计算与子树遍历
  if (!hasMarker && !hasExistingMarker) {
    userNameEl.dataset.xhuntSpecialMarkerHandled = 'true';
    userNameEl.dataset.xhuntSpecialMarkerUser = currentAuthor;
    return;
  }

  // 2. 针对有标记的推文：若已处理且作者一致，且现有 badge 已经与当前 marker 匹配，直接短路，避免重复遍历与重排
  if (
    userNameEl.dataset.xhuntSpecialMarkerHandled === 'true' &&
    userNameEl.dataset.xhuntSpecialMarkerUser === currentAuthor &&
    hasMarker &&
    hasExistingMarker
  ) {
    const marker = specialMarkersManager.getMarker(currentAuthor);
    const existingBadge = userNameEl.querySelector<HTMLElement>(
      '.xhunt-special-marker[data-xhunt-marker-node="true"]',
    );
    if (
      marker &&
      existingBadge &&
      existingBadge.getAttribute('data-xhunt-marker-text') ===
        getMarkerDisplayText(marker) &&
      existingBadge.getAttribute('data-xhunt-marker-color') ===
        (marker.color || 'danger-red') &&
      existingBadge.getAttribute('data-xhunt-marker-variant') ===
        (marker.variant || 'subtle')
    ) {
      return;
    }
  }

  const placement = resolveTweetPlacement(userNameEl, currentAuthor);
  const { targetContainer, anchorElement, mode } = placement;

  // 清理非目标容器内的残留徽章（例如单篇推文中遗留在根级的徽章）
  const orphanBadges = userNameEl.querySelectorAll<HTMLElement>(
    '.xhunt-special-marker',
  );
  orphanBadges.forEach((b) => {
    if (b.parentElement !== targetContainer) {
      b.remove();
    }
  });

  attachBadgeSafely(targetContainer, anchorElement, currentAuthor, mode);
  userNameEl.dataset.xhuntSpecialMarkerHandled = 'true';
  userNameEl.dataset.xhuntSpecialMarkerUser = currentAuthor;
}

/**
 * 处理个人主页 Profile Header (main div[data-testid="UserName"])
 */
function processProfileUserName(userNameEl: HTMLElement) {
  if (!userNameEl.isConnected) return;
  if (isChatPage()) return;
  if (userNameEl.closest('article')) return;

  const urlAuthor = extractUsernameFromUrl(window.location.href);
  let currentAuthor = urlAuthor ? urlAuthor.toLowerCase() : '';

  if (!currentAuthor) {
    const spans = userNameEl.querySelectorAll('span');
    for (const span of spans) {
      if (span.closest('.xhunt-special-marker')) continue;
      const t = (span.textContent || '').trim();
      if (/^@[a-zA-Z0-9_]+$/.test(t)) {
        currentAuthor = t.slice(1).toLowerCase();
        break;
      }
    }
  }

  const cleanUser = normalizeUsername(currentAuthor);
  const marker = cleanUser ? specialMarkersManager.getMarker(cleanUser) : null;

  // 若当前用户无特殊标记，清理该 profile 区域内所有 marker 并返回
  if (!marker) {
    const existing = userNameEl.querySelectorAll<HTMLElement>(
      '.xhunt-special-marker',
    );
    existing.forEach((el) => el.remove());
    delete userNameEl.dataset.xhuntSpecialMarkerUser;
    userNameEl.dataset.xhuntSpecialMarkerHandled = 'true';
    return;
  }

  const placement = resolveProfilePlacement(userNameEl, cleanUser);
  const { targetContainer, anchorElement, mode } = placement;

  // 安全清理孤儿徽章：仅清理不在正确 targetContainer 内部的旧残留徽章（例如历史遗留在第3行的），
  // 严禁误伤 targetContainer 内部的正在生效的徽章，杜绝无限删加死循环！
  const allMarkers = userNameEl.querySelectorAll<HTMLElement>(
    '.xhunt-special-marker',
  );
  allMarkers.forEach((markerNode) => {
    if (markerNode.parentElement !== targetContainer) {
      markerNode.remove();
    }
  });

  attachBadgeSafely(targetContainer, anchorElement, cleanUser, mode);
  userNameEl.dataset.xhuntSpecialMarkerHandled = 'true';
  userNameEl.dataset.xhuntSpecialMarkerUser = cleanUser;
}

/**
 * 处理私聊会话条目 (div[data-testid="conversation"])
 */
function processConversation(convEl: HTMLElement) {
  if (!convEl.isConnected) return;
  if (isChatPage()) return;

  const currentAuthor = extractConversationHandle(convEl);
  if (!currentAuthor) return;

  const hasMarker = specialMarkersManager.hasMarker(currentAuthor);
  const hasExistingMarker = Boolean(
    convEl.querySelector('.xhunt-special-marker'),
  );
  if (!hasMarker && !hasExistingMarker) {
    convEl.dataset.xhuntSpecialMarkerHandled = 'true';
    convEl.dataset.xhuntSpecialMarkerUser = currentAuthor;
    return;
  }
  let handleAnchor: HTMLElement | null = null;
  let handleRowContainer: HTMLElement | null = null;

  const spans = convEl.querySelectorAll('span');
  for (const span of spans) {
    if (span.closest('.xhunt-special-marker')) continue;
    const text = (span.textContent || '').trim();
    if (text.startsWith('@')) {
      let curr: HTMLElement = span;
      while (
        curr.parentElement &&
        curr.parentElement !== convEl &&
        !curr.parentElement.classList.contains('r-18u37iz')
      ) {
        curr = curr.parentElement;
      }
      handleAnchor = curr;
      handleRowContainer = curr.parentElement;
      break;
    }
  }

  const targetContainer = handleRowContainer || convEl;
  attachBadgeSafely(
    targetContainer,
    handleAnchor,
    currentAuthor,
    handleAnchor ? 'after' : 'append',
  );
  convEl.dataset.xhuntSpecialMarkerHandled = 'true';
  convEl.dataset.xhuntSpecialMarkerUser = currentAuthor;
}

/**
 * 处理私聊打开窗口 Header (div[data-testid="DM_Conversation_Avatar"])
 */
function processDmHeader(avatarEl: HTMLElement) {
  if (!avatarEl.isConnected) return;
  if (isChatPage()) return;
  const headerRow = avatarEl.parentElement;
  if (!headerRow) return;

  const spans = headerRow.querySelectorAll('span');
  let dmHandle = '';
  let handleAnchor: HTMLElement | null = null;
  let handleRowContainer: HTMLElement | null = null;

  for (const s of spans) {
    if (s.closest('.xhunt-special-marker')) continue;
    const text = (s.textContent || '').trim();
    if (/^@[a-zA-Z0-9_]+$/.test(text)) {
      dmHandle = text.slice(1).toLowerCase();
      let curr: HTMLElement = s;
      while (
        curr.parentElement &&
        curr.parentElement !== headerRow &&
        !curr.parentElement.classList.contains('r-18u37iz')
      ) {
        curr = curr.parentElement;
      }
      handleAnchor = curr;
      handleRowContainer = curr.parentElement;
      break;
    }
  }

  if (!dmHandle) return;

  const targetContainer = handleRowContainer || headerRow;
  attachBadgeSafely(
    targetContainer,
    handleAnchor || avatarEl,
    dmHandle,
    'after',
  );
}

// =============================================================================
// 从全局 MutationRecord 中高精增量收集受影响的目标节点
// =============================================================================

/**
 * /i/chat/ 会话列表条目选择器，兼容 testid 为 conversation 及 dm-conversation-item 开头的节点
 */
function getAllSearchRoots(): Array<Document | ShadowRoot> {
  if (typeof document === 'undefined') return [];
  const roots: Array<Document | ShadowRoot> = [document];
  const visited = new Set<Node>([document]);

  try {
    document.querySelectorAll('iframe').forEach((ifr) => {
      try {
        const doc = ifr.contentDocument || ifr.contentWindow?.document;
        if (doc && !visited.has(doc)) {
          visited.add(doc);
          roots.push(doc);
        }
      } catch (_) {}
    });

    document
      .querySelectorAll(
        'plasmo-csui, [id*="chat"], [id*="embed"], [data-testid*="chat"]',
      )
      .forEach((el) => {
        if (el.shadowRoot && !visited.has(el.shadowRoot)) {
          visited.add(el.shadowRoot);
          roots.push(el.shadowRoot);
        }
      });
  } catch (_) {}

  return roots;
}

function queryAllChatItems(): HTMLElement[] {
  const roots = getAllSearchRoots();
  const items: HTMLElement[] = [];
  const seen = new Set<HTMLElement>();

  roots.forEach((root) => {
    try {
      root.querySelectorAll<HTMLElement>(CHAT_ITEM_SELECTOR).forEach((el) => {
        if (!seen.has(el)) {
          seen.add(el);
          items.push(el);
        }
      });
    } catch (_) {}
  });

  return items;
}

function queryAllChatHeaders(): HTMLElement[] {
  const roots = getAllSearchRoots();
  const headers: HTMLElement[] = [];
  const seen = new Set<HTMLElement>();

  roots.forEach((root) => {
    try {
      root
        .querySelectorAll<HTMLElement>(CHAT_HEADER_USERNAME_SELECTOR)
        .forEach((el) => {
          if (!seen.has(el) && !el.closest(CHAT_ITEM_SELECTOR)) {
            seen.add(el);
            headers.push(el);
          }
        });
    } catch (_) {}
  });

  return headers;
}

const CHAT_ITEM_SELECTOR =
  'div[data-testid="conversation"], div[data-testid^="dm-conversation-item"]';

/**
 * 从 /i/chat/ 会话条目提取对方 handle
 * 优先级：aria 属性 -> 内部 a[href] -> 头像 testid -> span @handle
 */
function extractChatItemHandle(itemEl: HTMLElement): string {
  // 1. 从自身及子元素的 aria-label / aria-description 中提取 @handle
  const directAria =
    itemEl.getAttribute('aria-label') ||
    itemEl.getAttribute('aria-description') ||
    '';
  let match = directAria.match(/@([a-zA-Z0-9_]+)/);
  if (match && !RESERVED_PATHS.has(match[1].toLowerCase())) {
    return match[1].toLowerCase();
  }

  const ariaEl = itemEl.querySelector(
    '[aria-label*="@"], [aria-description*="@"]',
  );
  if (ariaEl) {
    const descendantAria =
      ariaEl.getAttribute('aria-label') ||
      ariaEl.getAttribute('aria-description') ||
      '';
    match = descendantAria.match(/@([a-zA-Z0-9_]+)/);
    if (match && !RESERVED_PATHS.has(match[1].toLowerCase())) {
      return match[1].toLowerCase();
    }
  }

  // 2. 从条目内包含的 a[href]（如头像链接或个人主页链接）提取
  const links = itemEl.querySelectorAll<HTMLAnchorElement>('a[href]');
  for (const link of links) {
    if (link.closest('.xhunt-special-marker')) continue;
    const href = link.getAttribute('href') || '';
    const linkMatch =
      href.match(/(?:x|twitter)\.com\/([a-zA-Z0-9_]+)\/?$/) ||
      href.match(/^\/([a-zA-Z0-9_]+)\/?$/);
    if (linkMatch) {
      const candidate = linkMatch[1].toLowerCase();
      if (!RESERVED_PATHS.has(candidate)) {
        return candidate;
      }
    }
  }

  // 3. 从头像容器 data-testid="UserAvatar-Container-<handle>" 提取
  const avatarContainer = itemEl.querySelector<HTMLElement>(
    '[data-testid^="UserAvatar-Container-"]',
  );
  if (avatarContainer) {
    const testId = avatarContainer.getAttribute('data-testid') || '';
    const avatarMatch = testId.match(/^UserAvatar-Container-([a-zA-Z0-9_]+)$/);
    if (
      avatarMatch &&
      avatarMatch[1] !== 'unknown' &&
      !RESERVED_PATHS.has(avatarMatch[1].toLowerCase())
    ) {
      return avatarMatch[1].toLowerCase();
    }
  }

  // 4. 从 href / testid 提取 twid，通过 specialMarkersManager 反查 handle
  const chatLink = itemEl.querySelector<HTMLAnchorElement>('a[href*="/i/chat/"]');
  const chatHref =
    chatLink?.getAttribute('href') || itemEl.getAttribute('data-testid') || '';
  const twidMatch = chatHref.match(/(\d{5,})[-:](\d{5,})/);
  if (twidMatch) {
    const candidate1 = specialMarkersManager.getHandleByTwid(twidMatch[1]);
    if (candidate1) return candidate1;
    const candidate2 = specialMarkersManager.getHandleByTwid(twidMatch[2]);
    if (candidate2) return candidate2;
  }

  // 5. 从显式包含 @handle 的 span 提取
  const spans = itemEl.querySelectorAll('span');
  for (const span of spans) {
    if (span.closest('.xhunt-special-marker')) continue;
    const text = (span.textContent || '').trim();
    if (/^@[a-zA-Z0-9_]+$/.test(text)) {
      return text.slice(1).toLowerCase();
    }
  }

  return '';
}

/**
 * 定位会话列表条目中昵称文本与挂载容器
 */
function findConversationNameAnchor(itemEl: HTMLElement): {
  targetContainer: HTMLElement;
  anchorElement: HTMLElement;
} | null {
  // 1. 优先查找名字元素：div.font-bold（如 Mirae）
  const nameEl =
    itemEl.querySelector<HTMLElement>('div.font-bold') ||
    itemEl.querySelector<HTMLElement>('[class*="font-bold"]');

  if (nameEl) {
    // 关键修复：XChat 使用 Base UI（[id*="base-ui-"] / [id*="xchat-embed"]），其容器带有 overflow-hidden 与 shrink-0，
    // 若直接将徽章作为子项插入其内部，会被 overflow-hidden 截断裁切为 0 宽度。
    // 因此向上查找其包装容器，将其挂载在最外层的水平 flex 行（div.flex.flex-row）内、在 embed 之后！
    const embedWrapper = nameEl.closest<HTMLElement>(
      '[id*="base-ui-"], [id*="xchat-embed"]',
    );
    if (
      embedWrapper &&
      embedWrapper.parentElement &&
      embedWrapper !== itemEl &&
      itemEl.contains(embedWrapper.parentElement)
    ) {
      return {
        targetContainer: embedWrapper.parentElement,
        anchorElement: embedWrapper,
      };
    }

    // 若无 embedWrapper，但 nameEl 的直接父级带有 overflow-hidden，往上找一行
    let curr: HTMLElement = nameEl;
    while (
      curr.parentElement &&
      curr.parentElement !== itemEl &&
      !curr.parentElement.classList.contains('flex-row') &&
      !curr.parentElement.classList.contains('r-18u37iz')
    ) {
      if (
        curr.parentElement.classList.contains('overflow-hidden') &&
        curr.parentElement.parentElement &&
        curr.parentElement.parentElement !== itemEl &&
        itemEl.contains(curr.parentElement.parentElement)
      ) {
        return {
          targetContainer: curr.parentElement.parentElement,
          anchorElement: curr.parentElement,
        };
      }
      curr = curr.parentElement;
    }

    if (curr.parentElement && curr.parentElement !== itemEl) {
      return {
        targetContainer: curr.parentElement,
        anchorElement: curr,
      };
    }

    if (nameEl.parentElement) {
      return {
        targetContainer: nameEl.parentElement,
        anchorElement: nameEl,
      };
    }
  }

  // 2. 遍历条目内文本节点兜底
  const spans = itemEl.querySelectorAll('span, [dir="auto"], [dir="ltr"]');
  for (const span of spans) {
    if (span.closest('.xhunt-special-marker')) continue;
    if (span.closest('[data-testid*="Avatar"]')) continue;
    const text = (span.textContent || '').trim();
    if (!text || text.startsWith('@')) continue;

    let curr: HTMLElement = span as HTMLElement;
    while (
      curr.parentElement &&
      curr.parentElement !== itemEl &&
      !curr.parentElement.classList.contains('r-18u37iz') &&
      !curr.parentElement.classList.contains('flex-row')
    ) {
      curr = curr.parentElement;
    }

    const container =
      curr.parentElement && curr.parentElement !== itemEl
        ? curr.parentElement
        : (span as HTMLElement).parentElement;

    if (container) {
      return {
        targetContainer: container,
        anchorElement: curr,
      };
    }
  }

  return null;
}

/**
 * 处理 /i/chat/ 会话列表条目：
 * 定位昵称容器并在同一 flex 行内挂载标记
 */
function processChatConversationItem(itemEl: HTMLElement) {
  if (!itemEl.isConnected) return;
  ensureSpecialMarkerStyles(itemEl);

  const handle = extractChatItemHandle(itemEl);
  const anchorInfo = findConversationNameAnchor(itemEl);
  const hasMarker = specialMarkersManager.hasMarker(handle);

  if (!specialMarkersManager.isReady() && !hasMarker) {
    return;
  }

  if (!anchorInfo || !anchorInfo.targetContainer) {
    itemEl
      .querySelectorAll<HTMLElement>('.xhunt-special-marker')
      .forEach((el) => el.remove());
    return;
  }

  const { targetContainer, anchorElement } = anchorInfo;
  const existingInTarget = targetContainer.querySelector(
    ':scope > .xhunt-special-marker',
  );
  const hasExisting = Boolean(
    existingInTarget || itemEl.querySelector('.xhunt-special-marker'),
  );

  // 清理非目标容器内的残留/孤儿徽章（例如以前误插入到 overflow-hidden 内部的徽章）
  itemEl.querySelectorAll<HTMLElement>('.xhunt-special-marker').forEach((b) => {
    if (b.parentElement !== targetContainer) {
      b.remove();
    }
  });

  if (!hasMarker && !hasExisting) {
    itemEl.dataset.xhuntSpecialMarkerHandled = 'true';
    itemEl.dataset.xhuntSpecialMarkerUser = handle;
    return;
  }

  if (
    itemEl.dataset.xhuntSpecialMarkerHandled === 'true' &&
    itemEl.dataset.xhuntSpecialMarkerUser === handle &&
    hasMarker &&
    existingInTarget
  ) {
    const marker = specialMarkersManager.getMarker(handle);
    if (
      marker &&
      existingInTarget.getAttribute('data-xhunt-marker-text') ===
        getMarkerDisplayText(marker)
    ) {
      return;
    }
  }

  attachBadgeSafely(targetContainer, anchorElement, handle, 'after');
  itemEl.dataset.xhuntSpecialMarkerHandled = 'true';
  itemEl.dataset.xhuntSpecialMarkerUser = handle;
}

/**
 * /i/chat/ 已打开会话的顶部 Header 容器选择器
 */
const CHAT_HEADER_USERNAME_SELECTOR =
  'div[data-testid="conversation-info-header"], div[data-testid="conversation-header"], div[data-testid="ConversationHeader"], div[data-testid="dm-conversation-header"], div[data-testid="dm-conversation-username"], div[data-testid="DM_Conversation_Avatar"]';

/**
 * 从 /i/chat/ 顶部 Header 提取对方 handle
 * 优先级：Header 工具栏内 profile 链接（“查看个人资料”/头像）-> 头像 testid -> URL twid 映射 -> 选中会话条目 -> 当前页面 pathname 匹配 -> span @handle
 */
function extractChatHeaderHandle(headerEl: HTMLElement): string {
  // 1. 查找 headerEl 及其向上至多 4 层容器（覆盖包含“查看个人资料”链接的整个 Header 工具栏）内的所有 a[href]
  let current: HTMLElement | null = headerEl;
  for (let i = 0; i < 4 && current && current !== document.body; i++) {
    const links = current.querySelectorAll<HTMLAnchorElement>('a[href]');
    for (const link of links) {
      if (link.closest('.xhunt-special-marker')) continue;
      const href = link.getAttribute('href') || '';
      const match =
        href.match(/(?:x|twitter)\.com\/([a-zA-Z0-9_]+)\/?$/) ||
        href.match(/^\/([a-zA-Z0-9_]+)\/?$/);
      if (match) {
        const candidate = match[1].toLowerCase();
        if (!RESERVED_PATHS.has(candidate)) {
          return candidate;
        }
      }
    }
    current = current.parentElement;
  }

  // 2. 从当前 Header 根节点范围内的 UserAvatar-Container 寻找
  const root =
    headerEl.closest<HTMLElement>('header, main, [role="region"]') ||
    headerEl.parentElement;
  const avatar = root?.querySelector<HTMLElement>(
    '[data-testid^="UserAvatar-Container-"]',
  );
  if (avatar) {
    const testId = avatar.getAttribute('data-testid') || '';
    const match = testId.match(/^UserAvatar-Container-([a-zA-Z0-9_]+)$/);
    if (
      match &&
      match[1] !== 'unknown' &&
      !RESERVED_PATHS.has(match[1].toLowerCase())
    ) {
      return match[1].toLowerCase();
    }
  }

  // 3. 从 URL /i/chat/<id1>-<id2> 提取参与者的 twid 匹配
  if (typeof window !== 'undefined') {
    const urlMatch = window.location.pathname.match(
      /\/i\/chat\/(\d+)[-:](\d+)/,
    );
    if (urlMatch) {
      const id1 = urlMatch[1];
      const id2 = urlMatch[2];
      const handle1 = specialMarkersManager.getHandleByTwid(id1);
      if (handle1) return handle1;
      const handle2 = specialMarkersManager.getHandleByTwid(id2);
      if (handle2) return handle2;
      if (specialMarkersManager.hasMarker(id1)) return id1;
      if (specialMarkersManager.hasMarker(id2)) return id2;
    }
  }

  // 4. 从当前选中的左侧会话条目中提取（兼容 data-selected="true" 与 aria-selected="true"）
  const activeItem = document.querySelector<HTMLElement>(
    'div[data-testid="conversation"][aria-selected="true"], div[data-testid^="dm-conversation-item"][aria-selected="true"], div[data-testid^="dm-conversation-item"][data-selected="true"], a[id^="dm-conversation-option"][data-active="true"]',
  );
  if (activeItem) {
    const itemEl =
      activeItem.closest<HTMLElement>(CHAT_ITEM_SELECTOR) || activeItem;
    const itemHandle = extractChatItemHandle(itemEl);
    if (itemHandle) return itemHandle;
  }

  // 5. 查找当前页面路径匹配的会话项
  if (typeof window !== 'undefined') {
    const curPath = window.location.pathname;
    const matchingLink = document.querySelector<HTMLAnchorElement>(
      `a[href*="${curPath}"]`,
    );
    if (matchingLink) {
      const itemEl = matchingLink.closest<HTMLElement>(CHAT_ITEM_SELECTOR);
      if (itemEl) {
        const itemHandle = extractChatItemHandle(itemEl);
        if (itemHandle) return itemHandle;
      }
    }
  }

  // 6. 从 Header 内显式带有 @handle 的文本中提取
  const spans = headerEl.querySelectorAll('span');
  for (const s of spans) {
    if (s.closest('.xhunt-special-marker')) continue;
    const t = (s.textContent || '').trim();
    if (/^@[a-zA-Z0-9_]+$/.test(t)) {
      return t.slice(1).toLowerCase();
    }
  }

  return '';
}

/**
 * 定位 /i/chat/ 顶部 Header 中昵称文本所在的容器与锚点
 */
function findChatHeaderNameAnchor(headerEl: HTMLElement): {
  targetContainer: HTMLElement;
  anchorElement: HTMLElement;
} | null {
  // 1. 优先查找名字元素（div.line-clamp-1 或 div.font-bold）
  const nameEl =
    headerEl.querySelector<HTMLElement>('div.line-clamp-1') ||
    headerEl.querySelector<HTMLElement>('div.font-bold') ||
    headerEl.querySelector<HTMLElement>('[class*="font-bold"]');

  if (nameEl) {
    const embedWrapper = nameEl.closest<HTMLElement>(
      '[id*="base-ui-"], [id*="xchat-embed"]',
    );
    if (
      embedWrapper &&
      embedWrapper.parentElement &&
      embedWrapper !== headerEl &&
      headerEl.contains(embedWrapper.parentElement)
    ) {
      return {
        targetContainer: embedWrapper.parentElement,
        anchorElement: embedWrapper,
      };
    }

    if (nameEl.parentElement) {
      return {
        targetContainer: nameEl.parentElement,
        anchorElement: nameEl,
      };
    }
  }

  const isInvalidNameText = (t: string) =>
    !t ||
    t.includes('加密') ||
    t.includes('个人资料') ||
    t.includes('Profile') ||
    t.includes('加入于') ||
    t.includes('Joined') ||
    t.includes('Follow') ||
    t.includes('关注');

  // 2. 若 headerEl 本身是用户名容器（如 dm-conversation-username / conversation-info-header）
  const spans = headerEl.querySelectorAll('span, [dir="auto"], [dir="ltr"]');
  for (const span of spans) {
    if (span.closest('.xhunt-special-marker')) continue;
    const text = (span.textContent || '').trim();
    if (isInvalidNameText(text)) continue;

    let curr: HTMLElement = span as HTMLElement;
    while (
      curr.parentElement &&
      curr.parentElement !== headerEl &&
      !curr.parentElement.classList.contains('r-18u37iz') &&
      !curr.parentElement.classList.contains('flex-row')
    ) {
      curr = curr.parentElement;
    }
    const container =
      curr.parentElement &&
      (curr.parentElement.classList.contains('r-18u37iz') ||
        curr.parentElement.classList.contains('flex-row'))
        ? curr.parentElement
        : (span as HTMLElement).parentElement || headerEl;

    return {
      targetContainer: container,
      anchorElement: curr,
    };
  }

  // 3. 若 headerEl 为头像或 Header 根节点，查找头像旁边的文本列容器中的首个有效文本节点
  const headerRoot =
    headerEl.closest<HTMLElement>('header, [role="region"], section') ||
    headerEl.parentElement;
  if (headerRoot) {
    const allSpans = headerRoot.querySelectorAll('span, [dir="auto"], [dir="ltr"]');
    for (const span of allSpans) {
      if (span.closest('.xhunt-special-marker')) continue;
      if (span.closest('a[role="link"]')) continue; // 排除“查看个人资料”按钮内部文本
      const text = (span.textContent || '').trim();
      if (isInvalidNameText(text)) continue;

      let curr: HTMLElement = span as HTMLElement;
      while (
        curr.parentElement &&
        curr.parentElement !== headerRoot &&
        !curr.parentElement.classList.contains('r-18u37iz') &&
        !curr.parentElement.classList.contains('flex-row')
      ) {
        curr = curr.parentElement;
      }
      const container =
        curr.parentElement &&
        (curr.parentElement.classList.contains('r-18u37iz') ||
          curr.parentElement.classList.contains('flex-row'))
          ? curr.parentElement
          : (span as HTMLElement).parentElement || headerRoot;

      return {
        targetContainer: container,
        anchorElement: curr,
      };
    }
  }

  return null;
}

/**
 * 处理 /i/chat/ 顶部 Header 昵称：
 * 定位 Header 中的 display name，将标记紧跟其后挂载在同一行内
 */
function processChatHeaderUsername(usernameEl: HTMLElement) {
  if (!usernameEl.isConnected) return;
  if (usernameEl.closest(CHAT_ITEM_SELECTOR)) return;
  ensureSpecialMarkerStyles(usernameEl);

  const handle = extractChatHeaderHandle(usernameEl);
  const anchorInfo = findChatHeaderNameAnchor(usernameEl);
  const hasMarker = specialMarkersManager.hasMarker(handle);

  if (!specialMarkersManager.isReady() && !hasMarker) {
    return;
  }

  if (!anchorInfo || !anchorInfo.targetContainer) {
    usernameEl
      .querySelectorAll<HTMLElement>('.xhunt-special-marker')
      .forEach((el) => el.remove());
    return;
  }

  const { targetContainer, anchorElement } = anchorInfo;
  const existingInTarget = targetContainer.querySelector(
    ':scope > .xhunt-special-marker',
  );
  const hasExisting = Boolean(
    existingInTarget || usernameEl.querySelector('.xhunt-special-marker'),
  );

  // 清理非目标容器内的残留徽章
  usernameEl
    .querySelectorAll<HTMLElement>('.xhunt-special-marker')
    .forEach((b) => {
      if (b.parentElement !== targetContainer) {
        b.remove();
      }
    });

  if (!hasMarker && !hasExisting) {
    usernameEl.dataset.xhuntSpecialMarkerHandled = 'true';
    usernameEl.dataset.xhuntSpecialMarkerUser = handle;
    return;
  }

  if (
    usernameEl.dataset.xhuntSpecialMarkerHandled === 'true' &&
    usernameEl.dataset.xhuntSpecialMarkerUser === handle &&
    hasMarker &&
    existingInTarget
  ) {
    const marker = specialMarkersManager.getMarker(handle);
    if (
      marker &&
      existingInTarget.getAttribute('data-xhunt-marker-text') ===
        getMarkerDisplayText(marker)
    ) {
      return;
    }
  }

  attachBadgeSafely(targetContainer, anchorElement, handle, 'after');
  usernameEl.dataset.xhuntSpecialMarkerHandled = 'true';
  usernameEl.dataset.xhuntSpecialMarkerUser = handle;
}

interface AffectedTargets {
  tweetUserNames: Set<HTMLElement>;
  profileUserNames: Set<HTMLElement>;
  conversations: Set<HTMLElement>;
  dmHeaders: Set<HTMLElement>;
  chatItems: Set<HTMLElement>;
  chatHeaderUsernames: Set<HTMLElement>;
}

function collectAffectedTargets(
  mutations: MutationRecord[],
  inChatPage: boolean,
): AffectedTargets {
  const tweetUserNames = new Set<HTMLElement>();
  const profileUserNames = new Set<HTMLElement>();
  const conversations = new Set<HTMLElement>();
  const dmHeaders = new Set<HTMLElement>();
  const chatItems = new Set<HTMLElement>();
  const chatHeaderUsernames = new Set<HTMLElement>();

  for (const m of mutations) {
    // 仅处理 childList，不再订阅 characterData（避免抬高全局 MutationObserver 的
    // 合并配置，殃及其他订阅者）；虚拟滚动回收节点换作者文本的边缘场景由
    // useGlobalScroll 订阅兜底校正
    if (m.type !== 'childList') continue;

    // childList: 节点挂载/卸载
    const targetEl =
      m.target instanceof HTMLElement ? m.target : m.target.parentElement;

    // 如果变动目标本身属于 xhunt marker 内部，忽略
    if (targetEl && targetEl.closest('.xhunt-special-marker')) {
      continue;
    }

    // 检查节点是否为 xhunt 特殊标记自身（包含 HTMLElement、SVG 元素及内部文本节点）
    const isMarkerNode = (node: Node): boolean => {
      if (node instanceof HTMLElement) {
        return (
          node.classList.contains('xhunt-special-marker') ||
          node.hasAttribute('data-xhunt-marker-node') ||
          Boolean(node.closest('.xhunt-special-marker'))
        );
      }
      if (typeof SVGElement !== 'undefined' && node instanceof SVGElement) {
        return Boolean(node.closest('.xhunt-special-marker'));
      }
      return Boolean(node.parentElement?.closest('.xhunt-special-marker'));
    };

    // 如果变动节点全部是 xhunt 特殊标记自身（添加或移除），直接跳过，杜绝自发变更导致循环触发！
    const isOnlyMarkerMutation =
      (m.addedNodes.length > 0 || m.removedNodes.length > 0) &&
      Array.from(m.addedNodes).every(isMarkerNode) &&
      Array.from(m.removedNodes).every(isMarkerNode);

    if (isOnlyMarkerMutation) {
      continue;
    }

    if (targetEl) {
      if (inChatPage) {
        const chatItem = targetEl.closest<HTMLElement>(CHAT_ITEM_SELECTOR);
        if (chatItem) {
          chatItems.add(chatItem);
        } else {
          const chatHeader = targetEl.closest<HTMLElement>(
            CHAT_HEADER_USERNAME_SELECTOR,
          );
          if (chatHeader && !chatHeader.closest(CHAT_ITEM_SELECTOR)) {
            chatHeaderUsernames.add(chatHeader);
          }
        }
      } else {
        const tweetUserName = targetEl.closest<HTMLElement>(
          'div[data-testid="User-Name"]',
        );
        if (tweetUserName) tweetUserNames.add(tweetUserName);

        const profileUserName = targetEl.closest<HTMLElement>(
          'main div[data-testid="UserName"]',
        );
        if (profileUserName) profileUserNames.add(profileUserName);

        const conv = targetEl.closest<HTMLElement>(
          'div[data-testid="conversation"]',
        );
        if (conv) conversations.add(conv);
      }
    }

    for (let i = 0; i < m.addedNodes.length; i++) {
      const node = m.addedNodes[i];
      if (!(node instanceof HTMLElement)) continue;

      if (
        node.hasAttribute('data-xhunt-marker-node') ||
        node.classList.contains('xhunt-special-marker')
      ) {
        continue;
      }

      if (inChatPage) {
        // /i/chat/ 会话列表条目
        if (node.matches(CHAT_ITEM_SELECTOR)) {
          chatItems.add(node);
        } else {
          node
            .querySelectorAll<HTMLElement>(CHAT_ITEM_SELECTOR)
            .forEach((c) => chatItems.add(c));
        }

        // /i/chat/ 顶部 Header 昵称（排除会话列表项内部的头像）
        if (
          node.matches(CHAT_HEADER_USERNAME_SELECTOR) &&
          !node.closest(CHAT_ITEM_SELECTOR)
        ) {
          chatHeaderUsernames.add(node);
        } else {
          node
            .querySelectorAll<HTMLElement>(CHAT_HEADER_USERNAME_SELECTOR)
            .forEach((el) => {
              if (!el.closest(CHAT_ITEM_SELECTOR)) {
                chatHeaderUsernames.add(el);
              }
            });
        }
      } else {
        // 推文 User-Name
        if (node.matches('div[data-testid="User-Name"]')) {
          tweetUserNames.add(node);
        } else if (node.matches('article')) {
          const un = node.querySelector<HTMLElement>(
            'div[data-testid="User-Name"]',
          );
          if (un) tweetUserNames.add(un);
        } else {
          node
            .querySelectorAll<HTMLElement>('div[data-testid="User-Name"]')
            .forEach((un) => tweetUserNames.add(un));
        }

        // 个人主页 Profile Header
        if (node.matches('main div[data-testid="UserName"]')) {
          profileUserNames.add(node);
        } else {
          node
            .querySelectorAll<HTMLElement>('main div[data-testid="UserName"]')
            .forEach((un) => profileUserNames.add(un));
        }

        // 私信会话
        if (node.matches('div[data-testid="conversation"]')) {
          conversations.add(node);
        } else {
          node
            .querySelectorAll<HTMLElement>('div[data-testid="conversation"]')
            .forEach((c) => conversations.add(c));
        }

        // 私信 Header
        if (node.matches('div[data-testid="DM_Conversation_Avatar"]')) {
          dmHeaders.add(node);
        } else {
          node
            .querySelectorAll<HTMLElement>(
              'div[data-testid="DM_Conversation_Avatar"]',
            )
            .forEach((a) => dmHeaders.add(a));
        }
      }
    }
  }

  return {
    tweetUserNames,
    profileUserNames,
    conversations,
    dmHeaders,
    chatItems,
    chatHeaderUsernames,
  };
}

export function useSpecialUserMarkers() {
  const { data: twId } = useFetchTwId();
  const currentUrl = useCurrentUrl();
  const { lang, t } = useI18n();

  // 0. 同步语言与 tooltip 文案到模块级副本（语言切换时更新）
  useEffect(() => {
    markerI18nLabels.lang = lang || 'zh';
    markerI18nLabels.reason = t('specialMarkerReasonLabel');
    markerI18nLabels.clickEvidence = t('specialMarkerClickEvidence');
  }, [lang, t]);

  // 全量同步扫描（仅在页面初次加载、路由变动、标记配置更新广播时执行）
  const scanAllTargets = useCallback(() => {
    const inChat = isChatPage();
    if (inChat) {
      getAllSearchRoots().forEach((root) => {
        root
          .querySelectorAll<HTMLElement>('.xhunt-special-marker')
          .forEach((marker) => {
            if (
              !marker.closest(CHAT_ITEM_SELECTOR) &&
              !marker.closest(CHAT_HEADER_USERNAME_SELECTOR)
            ) {
              marker.remove();
            }
          });
      });

      const chatItems = queryAllChatItems();
      let headerElements = queryAllChatHeaders();

      if (headerElements.length === 0) {
        const roots = getAllSearchRoots();
        roots.forEach((root) => {
          const fallbackHeader = root.querySelector<HTMLElement>(
            'main [role="region"] header, main section header, [data-testid="primaryColumn"] header',
          );
          if (fallbackHeader && !fallbackHeader.closest(CHAT_ITEM_SELECTOR)) {
            headerElements.push(fallbackHeader);
          }
        });
      }

      chatItems.forEach(processChatConversationItem);
      headerElements.forEach(processChatHeaderUsername);
      return;
    }

    document
      .querySelectorAll<HTMLElement>('main div[data-testid="UserName"]')
      .forEach(processProfileUserName);

    document
      .querySelectorAll<HTMLElement>('div[data-testid="User-Name"]')
      .forEach(processTweetUserName);

    document
      .querySelectorAll<HTMLElement>('div[data-testid="conversation"]')
      .forEach(processConversation);

    document
      .querySelectorAll<HTMLElement>(
        'div[data-testid="DM_Conversation_Avatar"]',
      )
      .forEach(processDmHeader);
  }, []);

  const scanRafIdRef = useRef<number | null>(null);

  const scheduleScanAllTargets = useCallback(() => {
    if (scanRafIdRef.current !== null) return;
    scanRafIdRef.current = window.requestAnimationFrame(() => {
      scanRafIdRef.current = null;
      scanAllTargets();
    });
  }, [scanAllTargets]);

  useEffect(() => {
    return () => {
      if (scanRafIdRef.current !== null) {
        window.cancelAnimationFrame(scanRafIdRef.current);
        scanRafIdRef.current = null;
      }
    };
  }, []);

  // 1. 初始化与 twId 联动同步
  useEffect(() => {
    specialMarkersManager.init(twId);
  }, [twId]);

  // 2. 监听标记数据更新广播（拉取到最新数据时全量重扫一次）
  useEffect(() => {
    const unsubscribe = specialMarkersManager.addListener(() => {
      scheduleScanAllTargets();
    });
    return unsubscribe;
  }, [scheduleScanAllTargets]);

  // 3. 路由或语言变化时重新全量评估（/i/chat/ 由 scanAllTargets 内部转为仅处理会话列表）
  useEffect(() => {
    scheduleScanAllTargets();
  }, [currentUrl, lang, scheduleScanAllTargets]);

  // 4. 订阅全局 MutationObserver（即时微任务通道：无防抖节流，同帧即时执行，消灭闪烁与滚动延迟。
  //    仅订阅 childList，不加 characterData，避免抬高全局合并配置殃及其他订阅者）
  useEffect(() => {
    scheduleScanAllTargets();

    const unsubscribe = subscribeToMutation(
      (mutations) => {
        const inChat = isChatPage();
        const {
          tweetUserNames,
          profileUserNames,
          conversations,
          dmHeaders,
          chatItems,
          chatHeaderUsernames,
        } = collectAffectedTargets(mutations, inChat);

        // /i/chat/ 页面仅处理会话列表条目与顶部 Header，其余区域不挂载标记
        if (inChat) {
          if (chatItems.size > 0) {
            chatItems.forEach(processChatConversationItem);
          } else {
            const allItems = queryAllChatItems();
            allItems.forEach(processChatConversationItem);
          }
          chatHeaderUsernames.forEach(processChatHeaderUsername);
          return;
        }

        tweetUserNames.forEach(processTweetUserName);
        profileUserNames.forEach(processProfileUserName);
        conversations.forEach(processConversation);
        dmHeaders.forEach(processDmHeader);
      },
      {
        childList: true,
        subtree: true,
      },
    );

    return () => {
      unsubscribe();
    };
  }, [scheduleScanAllTargets]);

  // 5. 订阅全局滚动监听器（共用全局 useGlobalScroll 单例，捕获虚拟滚动极速滑过时未触发完整 mutation 的边缘推文）
  useEffect(() => {
    let lastScrollCheck = 0;
    const SCROLL_CHECK_THROTTLE_MS = 150;

    const unsubscribeScroll = subscribeToScroll(() => {
      const now = Date.now();
      if (now - lastScrollCheck < SCROLL_CHECK_THROTTLE_MS) return;
      lastScrollCheck = now;

      // /i/chat/ 会话列表回收条目时可能仅更新属性/文本（无 childList），逐帧校验作者一致性
      if (isChatPage()) {
        const chatItems = queryAllChatItems();
        chatItems.forEach((item) => {
          if (!item.isConnected) return;
          const handle = extractChatItemHandle(item);
          if (
            item.dataset.xhuntSpecialMarkerHandled !== 'true' ||
            item.dataset.xhuntSpecialMarkerUser !== handle ||
            (specialMarkersManager.hasMarker(handle) &&
              !item.querySelector('.xhunt-special-marker'))
          ) {
            processChatConversationItem(item);
          }
        });
        return;
      }

      const tweetUserNames = document.querySelectorAll<HTMLElement>(
        'div[data-testid="User-Name"]',
      );
      tweetUserNames.forEach((un) => {
        if (!un.isConnected) return;
        // 未处理的推文进行处理（已处理为 'true' 或占位 'empty' 时不重复全量扫）
        if (
          !un.dataset.xhuntSpecialMarkerHandled ||
          un.dataset.xhuntSpecialMarkerHandled === 'false'
        ) {
          processTweetUserName(un);
          return;
        }
        // 如果之前已被标记为 'true'，仅当推文作者发生变化时才重新处理（虚拟列表节点复用）
        if (un.dataset.xhuntSpecialMarkerHandled === 'true') {
          const author = extractTweetHandle(un);
          if (author && un.dataset.xhuntSpecialMarkerUser !== author) {
            processTweetUserName(un);
          }
        }
      });
    });

    return () => {
      unsubscribeScroll();
    };
  }, []);

  // 6. /i/chat/ 页面进入时多频次保底扫描，后续变更由 MutationObserver、路由和滚动监听处理。
  useEffect(() => {
    if (!isChatPage()) return;

    const timeouts = [100, 1000, 5000, 10000].map((delay) =>
      window.setTimeout(() => {
        scheduleScanAllTargets();
      }, delay),
    );

    return () => {
      timeouts.forEach((t) => window.clearTimeout(t));
    };
  }, [currentUrl, scheduleScanAllTargets]);
}
