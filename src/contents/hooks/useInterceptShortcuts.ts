import React, { useEffect } from 'react';

// 定义要拦截的快捷键列表（支持单键和组合键）
const BLOCKED_SHORTCUTS = new Set([
  '?', 'j', 'k', '.', 'm', '/', 'l', 'r', 't', 's', 'b', 'u', 'x', 'o', 'i', 'n', 'h', 'f', 'e',
  'Meta+Enter', 'Enter', 'a+d', 'a+ ', 'a+m'
]);

/**
 * 自定义 Hook：拦截指定快捷键，防止与输入冲突
 *
 * @param inputRef - 输入框的 ref（textarea / input）
 * @param isComposingRef - 是否处于输入法状态的 ref
 */
export function useInterceptShortcuts(
  inputRef: React.RefObject<HTMLElement | HTMLTextAreaElement | HTMLInputElement>,
  isComposingRef: React.RefObject<boolean>
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!inputRef.current) return;
      const inputEl = inputRef.current;
      const modifiers = ['Control', 'Meta', 'Alt', 'Shift']
      .filter(key => e.getModifierState(key as any))
      .map(k => k.toLowerCase());

      const key = e.key.toLowerCase();

      let shortcutKey = key;

      if (modifiers.length > 0) {
        shortcutKey = `${modifiers.join('+')}${key}`;
      }

      // 如果不在黑名单中，放过
      if (!BLOCKED_SHORTCUTS.has(shortcutKey)) return;

      // console.log('拦截快捷键:', shortcutKey);

      // 阻止快捷键行为
      e.preventDefault();
      e.stopImmediatePropagation();

      // 插入字符
      requestIdleCallback(() => {
        if (isComposingRef.current) return;

        const el = inputEl as HTMLTextAreaElement | HTMLInputElement;

        const start = el.selectionStart ?? 0;
        const end = el.selectionEnd ?? 0;

        const value = el.value;
        el.value = value.substring(0, start) + String(key).trim() + value.substring(end);

        el.selectionStart = el.selectionEnd = start + 1;

        // 触发 input 事件，通知 React 更新
        const event = new Event('input', { bubbles: true });
        el.dispatchEvent(event);
      });
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);
}
