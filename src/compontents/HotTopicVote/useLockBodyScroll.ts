import { useEffect } from 'react';

let lockCount = 0;
let previousBodyOverflow = '';
let previousHtmlOverflow = '';

/**
 * 锁定页面滚动（计数器机制，支持多个弹窗嵌套/同时存在）
 */
export function lockPageScroll(): void {
  if (typeof document === 'undefined') return;

  if (lockCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  }
  lockCount++;
}

/**
 * 解锁页面滚动
 */
export function unlockPageScroll(): void {
  if (typeof document === 'undefined') return;

  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = previousBodyOverflow;
    document.documentElement.style.overflow = previousHtmlOverflow;
    previousBodyOverflow = '';
    previousHtmlOverflow = '';
  }
}

/**
 * 强制重置滚动锁定（兜底自愈）
 */
export function resetPageScrollLock(): void {
  if (typeof document === 'undefined') return;
  lockCount = 0;
  document.body.style.overflow = previousBodyOverflow;
  document.documentElement.style.overflow = previousHtmlOverflow;
  previousBodyOverflow = '';
  previousHtmlOverflow = '';
}

/**
 * 当弹窗打开时禁用整个网页的滚动，关闭时恢复原始滚动状态
 */
export function useLockBodyScroll(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked) return;

    lockPageScroll();

    return () => {
      unlockPageScroll();
    };
  }, [isLocked]);
}

export default useLockBodyScroll;
