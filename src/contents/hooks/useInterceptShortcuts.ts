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
  inputRef: React.RefObject<HTMLElement | HTMLTextAreaElement | HTMLInputElement>,
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

      // 阻止快捷键行为
      e.preventDefault();
      e.stopImmediatePropagation();

      requestAnimationFrame(() => {
        // 只有在非输入法状态下才插入字符
        if (!isComposingRef.current) {
          const el = inputEl as HTMLTextAreaElement | HTMLInputElement;

          try {
            // 保存当前值用于 React 16 valueTracker
            const lastValue = el.value;

            // 计算新值
            const start = el.selectionStart ?? 0;
            const end = el.selectionEnd ?? 0;
            const value = el.value;
            const newValue = value.substring(0, start) + String(key).trim() + value.substring(end);

            // 设置新值
            el.value = newValue;

            // 更新光标位置
            el.selectionStart = el.selectionEnd = start + 1;

            // React 16 valueTracker hack - 重置状态以便 React 能检测到变化
            const tracker = (el as any)._valueTracker;
            if (tracker) {
              tracker.setValue(lastValue);
            }

            // 触发 input 事件，通知 React 更新
            try {
              const inputEvent = new InputEvent('input', {
                bubbles: true,
                cancelable: true,
                inputType: 'insertText',
                data: String(key).trim()
              });
              el.dispatchEvent(inputEvent);
            } catch (err) {
              // 如果浏览器不支持 InputEvent，回退到 Event
              const event = new Event('input', { bubbles: true });
              el.dispatchEvent(event);
            }
          } catch (error) {
            console.log('Error inserting character:', error);
          }
        }
      });
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);
}
