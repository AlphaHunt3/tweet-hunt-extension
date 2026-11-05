import type { CleanerCategory, CleanerMode } from './types';
import { navigationService } from '~compontents/navigation/NavigationService';

/**
 * 唤起设置面板并定位至信息流净化设置项
 */
export function openCleanerSettings() {
  try {
    const openEvt = new CustomEvent('xhunt:open-panel');
    window.dispatchEvent(openEvt);
  } catch {}

  const triggerFocus = () => {
    try {
      window.dispatchEvent(new CustomEvent('xhunt:focus-cleaner-settings'));
    } catch {}
  };

  const navigate = () => {
    navigationService.navigateTo('main-panel', '/settings', {
      scrollToId: 'xhunt-feed-cleaner-settings',
      highlightCleaner: true,
      onArrive: triggerFocus,
    });
  };

  if (navigationService.hasPanel('main-panel')) {
    navigate();
  } else {
    // 面板尚未注册时等待注册完成再跳转，避免监听器常驻累积
    const onRegistered = () => {
      try {
        navigate();
      } catch {}
    };
    window.addEventListener('xhunt:panel-registered', onRegistered as any, {
      once: true,
    } as any);
  }

  triggerFocus();
  setTimeout(triggerFocus, 200);
  setTimeout(triggerFocus, 500);
}

/**
 * 净化流折叠状态下的作者昵称脱敏：
 * 规则：第一个字 + 星号最多3个 + 最后一个字
 */
export function maskCleanerAuthorName(name: string): string {
  if (!name) return '';
  const trimmed = name.trim();
  if (!trimmed) return '';

  const chars = Array.from(trimmed);
  if (chars.length <= 1) {
    return chars[0] || '';
  }

  const starCount = Math.min(3, Math.max(1, chars.length - 2));
  return `${chars[0]}${'*'.repeat(starCount)}${chars[chars.length - 1]}`;
}

export interface ApplyActionParams {
  article: HTMLElement;
  handle: string;
  authorName?: string;
  category?: CleanerCategory;
  mode: CleanerMode;
  warnLabel: string;
  collapseHint?: string;
}

export function applyAction({
  article,
  handle,
  authorName,
  category,
  mode,
  warnLabel,
  collapseHint,
}: ApplyActionParams) {
  article.dataset.xhuntCleanerHandled = 'true';
  article.dataset.xhuntCleanerAuthor = handle.toLowerCase();
  article.dataset.xhuntCleanerMode = mode;

  if (mode === 'hide') {
    delete article.dataset.xhuntCleanerExpanded;
    article.style.setProperty('display', 'none', 'important');
    article.dataset.xhuntCleanerAction = 'hidden';
    const warnTags = article.querySelectorAll('.xhunt-cleaner-warn-tag');
    warnTags.forEach((t) => t.remove());
    const existingBars = article.querySelectorAll('.xhunt-cleaner-bar');
    existingBars.forEach((b) => b.remove());
    return;
  }

  if (mode === 'collapse') {
    article.style.removeProperty('display');
    const warnTags = article.querySelectorAll('.xhunt-cleaner-warn-tag');
    warnTags.forEach((t) => t.remove());

    // 用户已手动展开过的推文保持展开，不再重新折叠
    if (article.dataset.xhuntCleanerExpanded === 'true') {
      delete article.dataset.xhuntCleanerAction;
      const existingBars = article.querySelectorAll('.xhunt-cleaner-bar');
      existingBars.forEach((b) => b.remove());
      return;
    }

    article.dataset.xhuntCleanerAction = 'collapsed';

    // 渲染或更新折叠条（头像 + 昵称 + handle + 箭头）
    let bar = article.querySelector<HTMLElement>(':scope > .xhunt-cleaner-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'xhunt-cleaner-bar';

      const avatarImg = document.createElement('img');
      avatarImg.className = 'xhunt-cleaner-bar-avatar';
      avatarImg.alt = '';
      bar.appendChild(avatarImg);

      const nameSpan = document.createElement('span');
      nameSpan.className = 'xhunt-cleaner-bar-name';
      bar.appendChild(nameSpan);

      const handleSpan = document.createElement('span');
      handleSpan.className = 'xhunt-cleaner-bar-handle';
      bar.appendChild(handleSpan);

      const hintSpan = document.createElement('span');
      hintSpan.className = 'xhunt-cleaner-bar-hint';
      bar.appendChild(hintSpan);

      // SVG 右箭头图标
      const arrowSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      arrowSvg.setAttribute('viewBox', '0 0 24 24');
      arrowSvg.setAttribute('fill', 'none');
      arrowSvg.setAttribute('stroke', 'currentColor');
      arrowSvg.setAttribute('stroke-width', '2.2');
      arrowSvg.setAttribute('stroke-linecap', 'round');
      arrowSvg.setAttribute('stroke-linejoin', 'round');
      arrowSvg.classList.add('xhunt-cleaner-bar-arrow');

      const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      arrowPath.setAttribute('d', 'm9 18 6-6-6-6');
      arrowSvg.appendChild(arrowPath);
      bar.appendChild(arrowSvg);

      article.prepend(bar);
    }

    // 绑定点击展开交互（阻止推文原生事件传播，避免跳转推文详情）
    if (!bar.dataset.xhuntBoundClick) {
      bar.dataset.xhuntBoundClick = 'true';
      bar.setAttribute('role', 'button');
      bar.setAttribute('tabindex', '0');

      const expand = () => {
        article.dataset.xhuntCleanerExpanded = 'true';
        delete article.dataset.xhuntCleanerAction;
        bar.remove();
      };

      const handleBarClick = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        expand();
      };

      bar.addEventListener('click', handleBarClick, true);

      bar.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          expand();
        }
      });

      const stopProp = (e: Event) => {
        e.stopPropagation();
      };
      bar.addEventListener('mousedown', stopProp, true);
      bar.addEventListener('mouseup', stopProp, true);
      bar.addEventListener('pointerdown', stopProp, true);
    }

    // 每次应用时刷新内容，防止复用旧推文单元格导致的信息错位
    const barAvatar = bar.querySelector<HTMLImageElement>('.xhunt-cleaner-bar-avatar');
    const avatarSrc =
      article.querySelector<HTMLImageElement>(
        "div[data-testid='Tweet-User-Avatar'] img, [data-testid='avatar'] img"
      )?.src || '';
    if (barAvatar) {
      if (avatarSrc) {
        barAvatar.src = avatarSrc;
        barAvatar.style.removeProperty('display');
      } else {
        barAvatar.style.setProperty('display', 'none', 'important');
      }
    }

    const userNameEl = article.querySelector(
      "div[data-testid='User-Name'], div[data-testid='UserName']"
    );
    const rawName =
      authorName ||
      userNameEl?.querySelector('span')?.textContent?.trim() ||
      '';
    const barName = bar.querySelector<HTMLElement>('.xhunt-cleaner-bar-name');
    if (barName) {
      const maskedName = maskCleanerAuthorName(rawName);
      barName.textContent = maskedName;
      barName.style.setProperty(
        'display',
        maskedName ? '' : 'none',
        'important'
      );
    }

    const barHandle = bar.querySelector<HTMLElement>('.xhunt-cleaner-bar-handle');
    if (barHandle) {
      barHandle.textContent = handle ? `@${handle}` : '';
      barHandle.style.setProperty('display', handle ? '' : 'none', 'important');
    }

    const barHint = bar.querySelector<HTMLElement>('.xhunt-cleaner-bar-hint');
    if (barHint && collapseHint) {
      barHint.textContent = collapseHint;
    }

    // 折叠条不展示命中原因 tooltip，仅保留无障碍标签
    bar.removeAttribute('title');
    bar.setAttribute('aria-label', `${warnLabel} @${handle}`);
    return;
  }

  // mode === 'mark' (标注黄推)
  delete article.dataset.xhuntCleanerExpanded;
  article.style.removeProperty('display');
  article.dataset.xhuntCleanerAction = 'marked';

  const existingBars = article.querySelectorAll('.xhunt-cleaner-bar');
  existingBars.forEach((b) => b.remove());

  // 渲染或更新警告小标签
  let badge = article.querySelector<HTMLElement>('.xhunt-cleaner-warn-tag');
  if (!badge) {
    badge = document.createElement('div');
    badge.className = 'xhunt-cleaner-warn-tag';

    // SVG 警告三角图标
    const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    iconSvg.setAttribute('viewBox', '0 0 24 24');
    iconSvg.setAttribute('fill', 'none');
    iconSvg.setAttribute('stroke', 'currentColor');
    iconSvg.setAttribute('stroke-width', '2.2');
    iconSvg.setAttribute('stroke-linecap', 'round');
    iconSvg.setAttribute('stroke-linejoin', 'round');
    iconSvg.classList.add('xhunt-cleaner-warn-icon');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute(
      'd',
      'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z'
    );

    const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line1.setAttribute('x1', '12');
    line1.setAttribute('y1', '9');
    line1.setAttribute('x2', '12');
    line1.setAttribute('y2', '13');

    const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line2.setAttribute('x1', '12');
    line2.setAttribute('y1', '17');
    line2.setAttribute('x2', '12.01');
    line2.setAttribute('y2', '17');

    iconSvg.appendChild(path);
    iconSvg.appendChild(line1);
    iconSvg.appendChild(line2);
    badge.appendChild(iconSvg);

    const textSpan = document.createElement('span');
    textSpan.className = 'xhunt-cleaner-warn-text';
    badge.appendChild(textSpan);

    // 优先插入到 tweetText 正上方
    const tweetText = article.querySelector("[data-testid='tweetText']");
    if (tweetText && tweetText.parentElement) {
      tweetText.parentElement.insertBefore(badge, tweetText);
    } else {
      const userNameEl = article.querySelector(
        "div[data-testid='User-Name'], div[data-testid='UserName']"
      );
      if (userNameEl && userNameEl.parentElement) {
        userNameEl.parentElement.insertAdjacentElement('afterend', badge);
      } else {
        article.prepend(badge);
      }
    }
  }

  // 绑定点击跳转设置交互（阻止推文原生事件传播）
  if (!badge.dataset.xhuntBoundClick) {
    badge.dataset.xhuntBoundClick = 'true';
    badge.setAttribute('role', 'button');
    badge.setAttribute('tabindex', '0');

    const handleBadgeClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      openCleanerSettings();
    };

    badge.addEventListener('click', handleBadgeClick, true);

    badge.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        openCleanerSettings();
      }
    });

    const stopProp = (e: Event) => {
      e.stopPropagation();
    };
    badge.addEventListener('mousedown', stopProp, true);
    badge.addEventListener('mouseup', stopProp, true);
    badge.addEventListener('pointerdown', stopProp, true);
  }

  const textSpan = badge.querySelector('.xhunt-cleaner-warn-text');
  if (textSpan) {
    textSpan.textContent = warnLabel;
  }

  // 标注标签不展示命中原因 tooltip，仅保留无障碍标签
  badge.removeAttribute('title');
  badge.setAttribute('aria-label', warnLabel);
}

export function restoreArticle(article: HTMLElement) {
  // cleaner 自身只动过 article 根节点的 display，不递归清理子孙节点，
  // 避免误恢复 Twitter 自身通过 inline style 隐藏的元素
  article.style.removeProperty('display');
  delete article.dataset.xhuntCleanerHandled;
  delete article.dataset.xhuntCleanerAuthor;
  delete article.dataset.xhuntCleanerMode;
  delete article.dataset.xhuntCleanerAction;
  delete article.dataset.xhuntCleanerExpanded;

  const bars = article.querySelectorAll('.xhunt-cleaner-bar');
  bars.forEach((b) => b.remove());

  const warnTags = article.querySelectorAll('.xhunt-cleaner-warn-tag');
  warnTags.forEach((t) => t.remove());
}
