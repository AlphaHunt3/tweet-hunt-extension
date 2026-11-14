import React, { useEffect } from 'react';

// 定义要拦截的快捷键列表（支持单键和组合键）
const BLOCKED_SHORTCUTS = new Set([
  '?', 'j', 'k', '.', 'm', '/', 'l', 'r', 't', 's', 'b', 'u', 'x', 'o', 'i', 'n', 'h', 'f', 'e', 'g',
  'Meta+Enter', 'Enter', 'a+d', 'a+ ', 'a+m'
]);

/**
 * 自定义 Hook：拦截指定快捷键，防止与输入冲突
 *
 * @param inputRef - 输入框的 ref（textarea / input）
 * @param isComposingRef - 是否处于输入法状态的 ref
 */
export function useInterceptShortcuts(
  inputRef: React.RefObject<HTMLElement | HTMLTextAreaElement | HTMLInputElement | null>,
  isComposingRef: React.RefObject<boolean>
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!inputRef.current) return;

      // 如果正在使用输入法（如中文输入），不拦截任何快捷键
      if (isComposingRef.current) {
        return;
      }

      const inputEl = inputRef.current;
      const modifiers = ['Control', 'Meta', 'Alt', 'Shift']
      .filter(key => e.getModifierState(key as any))
      .map(k => k.toLowerCase());

      const key = e.key.toLowerCase();

      let shortcutKey = key;

      if (modifiers.length > 0) {
        shortcutKey = `${modifiers.join('+')}+${key}`;
      }

      // 如果不在黑名单中，放过
      if (!BLOCKED_SHORTCUTS.has(shortcutKey)) return;

      // 普通字符仍交给浏览器原生输入，只阻止事件继续冒泡到 X 的快捷键监听。
      // 之前这里手动改 input.value 并派发 input 事件，在受控输入中可能导致值回滚。
      if (modifiers.length === 0 && key.length === 1) {
        e.stopImmediatePropagation();
        return;
      }

      // 组合快捷键/Enter 等非普通字符才阻止默认行为。
      e.preventDefault();
      e.stopImmediatePropagation();
    };

    // X 的快捷键可能绑定在 document 捕获阶段，window 捕获阶段更早。
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keypress', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keypress', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyDown, true);
    };
  }, []);
}
