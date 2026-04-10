import { useEffect, useRef } from 'react';
import {
  FloatingContainer,
  FloatingContainerRef,
} from '~/compontents/FloatingContainer';

export function AvatarRankHoverPanel() {
  const containerRef = useRef<FloatingContainerRef>(null);
  //   const [clickTarget, setClickTarget] = useState<HTMLElement | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const badge = target.closest('.xhunt-avatar-rank-badge');
      if (badge instanceof HTMLElement) {
        event.stopPropagation();
        event.preventDefault();
        event.stopImmediatePropagation();
        targetRef.current = badge;
        containerRef.current?.show();
      }
    };

    // 在 document.body 上添加全局点击事件监听器
    document.body.addEventListener('click', handleClick);

    return () => {
      document.body.removeEventListener('click', handleClick);
    };
  }, []); // 空依赖数组，确保监听器只在组件挂载时添加一次

  return (
    <FloatingContainer
      ref={containerRef}
      targetRef={targetRef}
      offsetX={-70}
      offsetY={20}
      className='z-[2000]'
    >
      <div className='p-4 w-64 h-24 theme-bg-primary theme-text-primary rounded-md shadow-lg border theme-border'>
        <p className='text-xs theme-text-secondary'>
          {/* 用户排名详情面板 (点击触发)... */}
        </p>
      </div>
    </FloatingContainer>
  );
}
