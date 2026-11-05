import React, { useCallback, useMemo, useRef } from 'react';
import { sanitizeHtml } from '~utils/sanitizeHtml';
import { SimpleTooltip } from '../SimpleTooltip';

export interface HotTopicRichTitleProps {
  title: string;
  titleHtml?: string | null;
  className?: string;
  suffix?: React.ReactNode;
}

export interface HotTopicRichSummaryProps {
  summary: string;
  summaryHtml?: string | null;
  className?: string;
}

/**
 * 客户端富文本标题与简介清洗，直接复用底层统一的安全清洗器
 */
export function sanitizeTitleClient(rawHtml: string): string {
  if (!rawHtml) return '';
  return sanitizeHtml(rawHtml);
}

/** 仅在内容被截断时，通过原生 title 悬浮展示完整纯文本 */
function useClampTooltip(plainText: string) {
  const ref = useRef<any>(null);
  const handleMouseEnter = useCallback(() => {
    const el = ref.current as HTMLElement | null;
    if (!el) return;
    const isTruncated =
      el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1;
    if (isTruncated && plainText) {
      el.setAttribute('title', plainText);
    } else {
      el.removeAttribute('title');
    }
  }, [plainText]);
  return { ref, handleMouseEnter };
}

/**
 * 议题标题富文本渲染组件（最多两行，超出省略，hover 展示全部）
 */
export const HotTopicRichTitle: React.FC<HotTopicRichTitleProps> = React.memo(
  ({ title, titleHtml, className = '', suffix }) => {
    const { ref, handleMouseEnter } = useClampTooltip(title);

    const safeHtml = useMemo(() => {
      if (!titleHtml) return null;
      return sanitizeHtml(titleHtml);
    }, [titleHtml]);

    if (safeHtml) {
      return (
        <h3
          ref={ref}
          onMouseEnter={handleMouseEnter}
          className={`text-[13px] font-bold theme-text-primary leading-snug line-clamp-2 break-words [&_a]:text-blue-500 hover:[&_a]:text-blue-600 [&_a]:underline [&_img.token-icon]:inline-block [&_img.token-icon]:w-4 [&_img.token-icon]:h-4 [&_img.token-icon]:rounded-full [&_img.token-icon]:object-cover [&_img.token-icon]:align-[-2px] [&_img.token-icon]:mx-0.5 [&_img.token-icon]:border [&_img.token-icon]:border-black/[0.08] dark:[&_img.token-icon]:border-white/[0.1] [&_img.token-icon]:shrink-0 [&_img:not(.token-icon)]:inline-block [&_img:not(.token-icon)]:max-h-5 [&_img:not(.token-icon)]:rounded-sm [&_.ql-align-center]:text-center [&_.ql-align-right]:text-right [&_p]:inline [&_p]:m-0 ${className}`}
        >
          <span dangerouslySetInnerHTML={{ __html: safeHtml }} />
          {suffix}
        </h3>
      );
    }

    return (
      <h3
        ref={ref}
        onMouseEnter={handleMouseEnter}
        className={`text-[13px] font-bold theme-text-primary leading-snug line-clamp-2 break-words ${className}`}
      >
        <span>{title}</span>
        {suffix}
      </h3>
    );
  }
);

/**
 * 核心冲突介绍富文本渲染组件（单行截断超出省略，hover 展示完整内容提示）
 */
export const HotTopicRichSummary: React.FC<HotTopicRichSummaryProps> = React.memo(
  ({ summary, summaryHtml, className = '' }) => {
    const safeHtml = useMemo(() => {
      if (!summaryHtml) return null;
      return sanitizeHtml(summaryHtml);
    }, [summaryHtml]);

    const tooltipContent = useMemo(() => {
      if (safeHtml) {
        return (
          <div
            className='w-full whitespace-normal break-words leading-relaxed text-left text-xs [&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_a]:text-blue-400 [&_a]:underline'
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        );
      }
      return (
        <span className='block w-full whitespace-normal break-words leading-relaxed text-left text-xs'>
          {summary}
        </span>
      );
    }, [safeHtml, summary]);

    return (
      <SimpleTooltip
        placement='bottom'
        fullWidth={true}
        onlyWhenOverflow={true}
        className='w-full !block !px-0 !mx-0 !py-0 !my-0'
        content={tooltipContent}
      >
        <p
          className={`text-[11.5px] theme-text-secondary leading-snug truncate w-full cursor-default ${className}`}
        >
          {summary}
        </p>
      </SimpleTooltip>
    );
  }
);

export default HotTopicRichTitle;
