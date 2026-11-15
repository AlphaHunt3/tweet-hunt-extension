import React, { useState, useEffect, useMemo } from 'react';
import { useI18n } from '~contents/hooks/i18n.ts';
import dayjs from 'dayjs';
import { messageManager, Message, MessageState } from '~/utils/messageManager';
import { useUserDomain } from '~contents/hooks/useUserDomain';
import { escapeHtml, sanitizeHtml } from '~utils/sanitizeHtml';
import { RowButton } from '~/ui/primitives';
import { cx } from '~/ui/primitives/cx';
import { EmptyState, Skeleton } from '~/ui/panel/PanelSection';

const messageKey = (message: Message) => String(message.id ?? `${message.created}-${message.title}`);

export function InAppMessages() {
  const [messageState, setMessageState] = useState<MessageState>(
    messageManager.getState()
  );
  const { t } = useI18n();
  const { domains } = useUserDomain();

  // Filter messages by domain type
  const filteredMessages = useMemo(() => {
    return messageState.messages.filter((msg) => {
      const msgType = (msg.type || 'all').trim().toLowerCase();
      if (!msgType || msgType === 'all') return true;
      return domains.includes(msgType as 'web3' | 'ai');
    });
  }, [messageState.messages, domains]);

  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(
    new Set()
  );

  const toggleMessageExpand = (key: string, e: React.MouseEvent) => {
    // Stop propagation to prevent panel closing
    e.stopPropagation();

    setExpandedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Subscribe to message manager updates
  useEffect(() => {
    // Initialize message manager if needed
    if (!messageManager.getState().messages.length) {
      messageManager.init();
    }

    // Add callback to listen for message state changes
    const removeCallback = messageManager.addCallback((state) => {
      setMessageState(state);
    });

    return () => {
      removeCallback();
    };
  }, []);

  // Format message date
  const formatMessageDate = (timestamp: string) => {
    return dayjs(parseInt(timestamp)).format('YYYY-MM-DD HH:mm');
  };

  // Get preview content with configurable length
  const getPreviewContent = (content: string, maxLen: number = 80) => {
    return content.length > maxLen
      ? content.substring(0, maxLen) + '...'
      : content;
  };

  // Normalize content newlines to HTML <br/> when content is plain text
  const toHtmlWithLineBreaks = (content: string) => {
    // If it already contains HTML tags, keep as-is
    const hasHtmlTag = /<[^>]+>/.test(content);
    if (hasHtmlTag) return content;
    // First unescape literal \n to real newlines, then convert to <br/>
    const withRealNewlines = content.replace(/\\n/g, '\n');
    return escapeHtml(withRealNewlines).replace(/\n/g, '<br/>');
  };

  if (messageState.isLoading && filteredMessages.length === 0) {
    return (
      <div className='flex flex-col gap-2 p-3'>
        <Skeleton className='h-16' />
        <Skeleton className='h-16' />
      </div>
    );
  }

  if (filteredMessages.length === 0) {
    return <EmptyState>{messageState.error || t('noMessages')}</EmptyState>;
  }

  return (
    <div className='flex flex-col soft:gap-2 obsidian:mx-3 obsidian:mb-3 obsidian:rounded-xh-card obsidian:bg-xh-raised obsidian:px-3 obsidian:shadow-xh-card'>
      {filteredMessages.map((message, index) => {
        const key = messageKey(message);
        const expanded = expandedMessages.has(key);
        const content = expanded
          ? message.content
          : getPreviewContent(message.content, index === 0 ? 600 : 80);
        return (
          <article
            key={key}
            className='xh-rise flex flex-col gap-1.5 soft:rounded-xh-card soft:bg-xh-raised soft:p-3 soft:shadow-xh-card obsidian:border-t obsidian:border-xh-line obsidian:py-2.5 obsidian:first:border-t-0 native:border-b native:border-xh-line native:px-4 native:py-3'
          >
            <div className='flex items-start justify-between gap-3'>
              <h4 className='text-[12.5px] font-semibold leading-snug native:text-[15px] native:font-bold'>
                {message.title}
              </h4>
              <time className='shrink-0 pt-px font-xh-num text-[11px] tabular-nums text-xh-fg-2 native:text-[13px]'>
                {formatMessageDate(message.created)}
              </time>
            </div>
            <div
              className={cx(
                'whitespace-pre-wrap break-words text-[12px] leading-relaxed text-xh-fg-2 native:text-[14px] [&_a]:text-xh-accent-fg [&_a]:underline',
                !expanded && (index === 0 ? 'line-clamp-6' : 'line-clamp-3'),
              )}
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(toHtmlWithLineBreaks(content)),
              }}
            />
            {message.content.length > 80 ? (
              <RowButton
                onClick={(e) => toggleMessageExpand(key, e)}
                className='w-auto self-start rounded-md text-[11.5px] text-xh-accent-fg hover:bg-transparent hover:underline native:text-[13px]'
              >
                {expanded ? t('showLess') : t('showMore')}
              </RowButton>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
