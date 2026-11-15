import { useEffect, useRef, type RefObject } from 'react';

// X 的快捷键挂在 document 捕获阶段，window 捕获阶段更早，在这里挡住才来得及；
// 挡住之后 React 的 onKeyDown 和弹层的 Esc 都收不到，回车和 Esc 只能在这里处理
export function useKeyGuard(
  inputRef: RefObject<HTMLInputElement | null>,
  onEnter?: (value: string) => void,
  onEscape?: () => void,
) {
  const onEnterRef = useRef(onEnter);
  onEnterRef.current = onEnter;
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    const guard = (event: KeyboardEvent) => {
      const input = inputRef.current;
      if (!input || event.isComposing || !event.composedPath().includes(input)) return;
      event.stopImmediatePropagation();
      if (event.type !== 'keydown') return;
      if (event.key === 'Enter' && onEnterRef.current) {
        event.preventDefault();
        onEnterRef.current(input.value);
      } else if (event.key === 'Escape' && onEscapeRef.current) {
        event.preventDefault();
        onEscapeRef.current();
      }
    };
    const types = ['keydown', 'keypress', 'keyup'] as const;
    types.forEach((type) => window.addEventListener(type, guard, true));
    return () => types.forEach((type) => window.removeEventListener(type, guard, true));
  }, [inputRef]);
}
