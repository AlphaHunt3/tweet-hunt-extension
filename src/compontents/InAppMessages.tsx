import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useI18n } from '~contents/hooks/i18n.ts';
import dayjs from 'dayjs';
import { messageManager, MessageState } from '~/utils/messageManager';

export function InAppMessages() {
  const [messageState, setMessageState] = useState<MessageState>(
    messageManager.getState()
  );
  const { t } = useI18n();

  // Track expanded message state
  const [expandedMessages, setExpandedMessages] = useState<Set<number>>(
    new Set()
  );

  // Toggle message expansion
  const toggleMessageExpand = (index: number, e: React.MouseEvent) => {
    // Stop propagation to prevent panel closing
    e.stopPropagation();

    setExpandedMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
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
    return withRealNewlines.replace(/\n/g, '<br/>');
  };

  return (
    <div className='w-full'>
      <div className='overflow-y-auto max-h-[calc(90vh-150px)] custom-scrollbar'>
        {messageState.isLoading && messageState.messages.length === 0 ? (
          <div className='flex items-center justify-center p-4'>
            <div className='w-5 h-5 border-2 border-t-blue-400 border-blue-200 rounded-full animate-spin'></div>
          </div>
        ) : messageState.error && messageState.messages.length === 0 ? (
          <div className='p-4 text-center text-sm theme-text-secondary'>
            {messageState.error}
          </div>
        ) : messageState.messages.length === 0 ? (
          <div className='p-4 text-center text-sm theme-text-secondary'>
            {t('noMessages')}
          </div>
        ) : (
          messageState.messages.map((message, index) => (
            <div
              key={index}
              className={`p-4 theme-border border-b last:border-b-0`}
            >
              <div className='flex items-center justify-between mb-2'>
                <h4 className='font-medium text-sm theme-text-primary'>
                  {message.title}
                </h4>
                <span className='text-xs theme-text-secondary'>
                  {formatMessageDate(message.created)}
                </span>
              </div>
              <div className='text-sm theme-text-secondary'>
                <div
                  className={`${
                    expandedMessages.has(index)
                      ? ''
                      : index === 0
                      ? 'line-clamp-6'
                      : 'line-clamp-3'
                  } whitespace-pre-wrap leading-relaxed`}
                  dangerouslySetInnerHTML={{
                    __html: expandedMessages.has(index)
                      ? toHtmlWithLineBreaks(message.content)
                      : toHtmlWithLineBreaks(
                          getPreviewContent(
                            message.content,
                            index === 0 ? 600 : 80
                          )
                        ),
                  }}
                ></div>
                {message.content.length > 80 && (
                  <button
                    onClick={(e) => toggleMessageExpand(index, e)}
                    className='mt-2 text-xs text-blue-400 hover:underline flex items-center'
                  >
                    {expandedMessages.has(index) ? (
                      <>
                        <ChevronUp className='w-3.5 h-3.5 mr-1' />
                        {t('showLess')}
                      </>
                    ) : (
                      <>
                        <ChevronDown className='w-3.5 h-3.5 mr-1' />
                        {t('showMore')}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
