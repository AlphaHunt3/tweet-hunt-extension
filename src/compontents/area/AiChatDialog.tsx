import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  FloatingContainer,
  FloatingContainerRef,
} from '~/compontents/FloatingContainer';
import { X, Send, Sparkles, Pause, Trash2, Copy, Check } from 'lucide-react';
import { fetchAiChat } from '~/contents/services/api';
import { chatHistoryManager } from '~/storage/chatHistoryManager';
import { ChatMessage } from '~/types';
import { useI18n } from '~contents/hooks/i18n.ts';
// 简单的Markdown处理函数
const simpleMarkdownToHtml = (text: string): string => {
  return (
    text
      // 代码块 (需要在行内代码之前处理)
      .replace(
        /```([\s\S]*?)```/g,
        '<pre class="lato-font bg-gray-100 dark:bg-gray-800 rounded-md p-2 overflow-x-auto my-1"><code>$1</code></pre>'
      )
      // 标题 (从大到小) - 更紧凑的样式
      .replace(
        /^###### (.*$)/gim,
        '<h6 class="lato-font text-xs font-medium mt-1 mb-1">$1</h6>'
      )
      .replace(
        /^##### (.*$)/gim,
        '<h5 class="lato-font text-sm font-medium mt-1 mb-1">$1</h5>'
      )
      .replace(
        /^#### (.*$)/gim,
        '<h4 class="lato-font text-sm font-semibold mt-2 mb-1">$1</h4>'
      )
      .replace(
        /^### (.*$)/gim,
        '<h3 class="lato-font text-base font-semibold mt-2 mb-1">$1</h3>'
      )
      .replace(
        /^## (.*$)/gim,
        '<h2 class="lato-font text-lg font-semibold mt-2 mb-1">$1</h2>'
      )
      .replace(
        /^# (.*$)/gim,
        '<h1 class="lato-font text-xl font-bold mt-2 mb-1">$1</h1>'
      )
      // 粗体
      .replace(/\*\*(.*?)\*\*/g, '<span class="lato-font">$1</span>')
      // 斜体 (避免与粗体和列表冲突，不匹配行首的*)
      .replace(/([^*\n]|^)\*([^*\n]+)\*([^*]|$)/g, '$1<em>$2</em>$3')
      // 删除线
      .replace(/~~(.*?)~~/g, '<del>$1</del>')
      // 行内代码
      .replace(
        /`(.*?)`/g,
        '<code class="lato-font px-1 py-0.5 rounded text-sm">$1</code>'
      )
      // 无序列表
      .replace(/^\* (.+$)/gim, '<li class="lato-font ml-3 my-0.5">$1</li>')
      .replace(/^- (.+$)/gim, '<li class="lato-font ml-3 my-0.5">$1</li>')
      // 有序列表
      .replace(
        /^\d+\. (.+$)/gim,
        '<li class="lato-font ml-3 my-0.5 list-decimal">$1</li>'
      )
      // 引用
      .replace(
        /^> (.+$)/gim,
        '<blockquote class="lato-font border-l-4 border-gray-300 pl-3 italic text-gray-600 dark:text-gray-400 my-1">$1</blockquote>'
      )
      // 分割线
      .replace(
        /^---$/gim,
        '<hr class="border-t border-gray-200 dark:border-gray-200 my-2">'
      )
      // 链接
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (match, text, url) {
        const isImage = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(url);
        if (isImage) {
          return `<img src="${url}" alt="${text}" class="lato-font max-w-full h-auto rounded" style="max-height: 100px;" />`;
        } else {
          return `<a href="${url}" class="lato-font text-blue-500 hover:text-blue-600 underline" target="_blank" rel="noopener noreferrer">${text}</a>`;
        }
      })
      // 换行 (最后处理)
      .replace(/\n/g, '<p style="margin: 1px 0px;height: 0px;"></p>')
  );
};

// 定义事件类型
export const AI_CHAT_EVENT = 'ai-chat-event';

export interface AiChatDetail {
  userId: string;
  element: HTMLElement;
}

export function AiChatDialog() {
  const { t } = useI18n();
  const [chatDetail, setChatDetail] = useState<AiChatDetail | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<FloatingContainerRef>(null);
  const responseTimerRef = useRef<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isResponding, setIsResponding] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [displayedContent, setDisplayedContent] = useState<string>('');
  const [currentStream, setCurrentStream] =
    useState<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(
    null
  );

  // 字数限制配置
  const MAX_INPUT_LENGTH = 1000; // 最大输入字数
  const MIN_INPUT_LENGTH = 1; // 最小输入字数

  // 使用 useRef 来避免闭包问题
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const typingIndexRef = useRef<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const targetContentRef = useRef<string>('');
  const isStreamingRef = useRef<boolean>(false);
  const isRespondingRef = useRef<boolean>(false);

  // 添加禁止滚动的函数
  const disableBodyScroll = useCallback(() => {
    const body = document.body;
    body.style.overflow = 'hidden';
  }, []);

  // 恢复滚动的函数
  const enableBodyScroll = useCallback(() => {
    const body = document.body;
    body.style.overflow = '';
  }, []);

  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

  useEffect(() => {
    isRespondingRef.current = isResponding;
  }, [isResponding]);

  // 同步打字状态到ref，避免闭包问题
  const isTypingRef = useRef<boolean>(false);
  useEffect(() => {
    isTypingRef.current = isTyping;
  }, [isTyping]);

  // 共享的打字循环函数
  const typeNextChar = useCallback(() => {
    const currentIndex = typingIndexRef.current;
    const currentTarget = targetContentRef.current;

    // 调试信息（避免引入 state 造成闭包不一致）
    console.log('typeNextChar:', {
      currentIndex,
      currentTargetLength: currentTarget.length,
      isStreaming: isStreamingRef.current,
    });

    if (currentIndex < currentTarget.length) {
      // 打字速度与步长（固定为逐字，以避免"成坨"视觉）
      const charsToType = 1;
      const progress = currentIndex / Math.max(1, currentTarget.length);
      // 随进度稍调速度，但不合并字符
      const typingSpeed = progress > 0.7 ? 18 : progress > 0.5 ? 22 : 28;

      const newContent = currentTarget.slice(0, currentIndex + charsToType);
      setDisplayedContent(newContent);
      typingIndexRef.current = currentIndex + charsToType;

      typingTimerRef.current = setTimeout(typeNextChar, typingSpeed);
    } else {
      // 已打到当前目标末尾
      if (isStreamingRef.current) {
        // 仍在流式接收，短暂等待新内容再尝试
        console.log('Waiting for more content...');
        typingTimerRef.current = setTimeout(typeNextChar, 16); // 减少等待时间，更快响应新内容
      } else {
        // 流结束且已打完
        console.log('Typing finished');
        setIsTyping(false);
        typingTimerRef.current = null;
      }
    }
  }, []);

  // 打字效果函数 - 动态速度调整
  const startTypingEffect = useCallback(
    (startIndex: number = 0) => {
      // 清理之前的定时器
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }

      setIsTyping(true);
      typingIndexRef.current = startIndex;

      // 如果是从中间开始，先显示已打出的内容
      if (startIndex > 0) {
        const currentTarget = targetContentRef.current;
        setDisplayedContent(
          currentTarget.slice(0, Math.min(startIndex, currentTarget.length))
        );
      } else {
        setDisplayedContent('');
      }

      // 立即开始第一个字符
      typeNextChar();
    },
    [typeNextChar]
  );

  // 停止打字效果
  const stopTypingEffect = useCallback(() => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    setIsTyping(false);
    // 立即显示完整内容
    if (targetContentRef.current) {
      setDisplayedContent(targetContentRef.current);
    }
  }, []);

  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // 复制消息内容
  const handleCopyMessage = useCallback(
    async (content: string, messageIndex: number) => {
      try {
        await navigator.clipboard.writeText(content);
        setCopiedMessageIndex(messageIndex);
        // 2秒后重置复制状态
        setTimeout(() => setCopiedMessageIndex(null), 2000);
      } catch (error) {
        console.error('复制失败:', error);
      }
    },
    []
  );

  // 初始化聊天历史管理器
  useEffect(() => {
    chatHistoryManager.init();
  }, []);

  // 监听消息变化，自动滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleChatEvent = useCallback(
    async (event: CustomEvent<AiChatDetail>) => {
      const detail = event.detail;
      if (detail && detail.element) {
        targetRef.current = detail.element;
        setChatDetail(detail);

        // 加载聊天历史
        const history = chatHistoryManager.getHistory(detail.userId);
        if (history.length > 0) {
          setMessages(history);
          // 延迟滚动到底部，确保DOM已更新
          setTimeout(() => scrollToBottom(), 100);
        } else {
          // 如果没有历史记录，显示欢迎消息
          const welcomeMessage: ChatMessage = {
            role: 'assistant',
            content: t('aiChatWelcome').replace('{userId}', detail.userId),
          };
          setMessages([welcomeMessage]);
          // 保存欢迎消息到历史记录
          await chatHistoryManager.addMessage(detail.userId, welcomeMessage);
          // 延迟滚动到底部，确保DOM已更新
          setTimeout(() => scrollToBottom(), 100);
        }
      }
    },
    [t, scrollToBottom]
  );

  // 监听 chatDetail 变化，确保状态更新后再显示
  useEffect(() => {
    if (chatDetail && targetRef.current) {
      containerRef.current?.show();
      // 弹框显示时禁止页面滚动
      disableBodyScroll();
    }
  }, [chatDetail, disableBodyScroll]);

  // 弹框关闭时的回调
  const handleContainerClose = useCallback(() => {
    // 恢复页面滚动
    enableBodyScroll();
    // 清理状态
    setChatDetail(null);
    setMessages([]);
    setCopiedMessageIndex(null);
  }, [enableBodyScroll]);

  useEffect(() => {
    const eventHandler = (event: Event) => {
      if (event instanceof CustomEvent) {
        handleChatEvent(event as CustomEvent<AiChatDetail>);
      }
    };

    window.addEventListener(AI_CHAT_EVENT, eventHandler);
    return () => {
      window.removeEventListener(AI_CHAT_EVENT, eventHandler);
    };
  }, [handleChatEvent]);

  const handleClose = useCallback(async () => {
    // 先设置状态，确保任何正在进行的操作都知道要停止
    setIsResponding(false);
    setIsStreaming(false);
    setIsTyping(false);

    if (responseTimerRef.current) {
      clearTimeout(responseTimerRef.current);
      responseTimerRef.current = null;
    }

    // 停止当前流式响应
    if (currentStream) {
      try {
        await currentStream.cancel();
      } catch (error) {
        console.error('Error canceling stream:', error);
      }
      setCurrentStream(null);
    }

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    containerRef.current?.hide();
    setChatDetail(null);
    setMessages([]);
    setCopiedMessageIndex(null);
  }, [currentStream]);

  // 内容过滤函数
  const filterInputContent = (content: string): string => {
    // 过滤掉一些不应该输入的内容
    return content
      .replace(/[<>]/g, '') // 过滤HTML标签
      .replace(/javascript:/gi, '') // 过滤JavaScript协议
      .replace(/data:/gi, '') // 过滤data协议
      .replace(/vbscript:/gi, '') // 过滤VBScript协议
      .trim();
  };

  const handleSendMessage = async () => {
    if (isResponding || !chatDetail) return;

    const filteredInput = filterInputContent(inputValue);
    if (!filteredInput || filteredInput.length < MIN_INPUT_LENGTH) {
      alert(`输入内容至少需要 ${MIN_INPUT_LENGTH} 个字符`);
      return;
    }

    if (filteredInput.length > MAX_INPUT_LENGTH) {
      alert(`输入内容不能超过 ${MAX_INPUT_LENGTH} 个字符`);
      return;
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: filteredInput,
    };

    // 保存用户消息到历史记录
    await chatHistoryManager.addMessage(chatDetail.userId, userMessage);

    // 从历史记录重新加载消息到UI（避免重复）
    const updatedHistory = chatHistoryManager.getHistory(chatDetail.userId);
    setMessages(updatedHistory);

    // 清空输入框
    setInputValue('');

    // 立即添加AI消息占位符，用于显示状态
    const aiMessage: ChatMessage = {
      role: 'assistant',
      content: '',
    };
    // 从历史记录重新加载消息，然后添加AI占位符
    const currentHistory = chatHistoryManager.getHistory(chatDetail.userId);
    setMessages([...currentHistory, aiMessage]);

    // 立即滚动到底部
    setTimeout(() => scrollToBottom(), 100);

    // 开始AI响应 - 等待接口返回状态
    setIsResponding(true);
    setIsStreaming(false);

    try {
      // 获取最近的聊天历史（最多5条）
      const recentHistory = chatHistoryManager.getRecentHistoryForAPI(
        chatDetail.userId
      );

      // 调用AI接口
      const stream = await fetchAiChat(chatDetail.userId, recentHistory, [
        userMessage,
      ]);

      if (!stream) {
        throw new Error('Failed to get AI response stream');
      }

      // 创建流式读取器
      const reader = stream.getReader();
      setCurrentStream(reader);

      // 切换到流式接收状态
      setIsStreaming(true);

      let fullContent = '';
      let hasStartedTyping = false;
      const decoder = new TextDecoder();
      // SSE缓冲区，用于处理跨chunk的数据块
      let sseBuffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          // 检查是否已经停止响应（用户点击停止或关闭弹框）
          if (!isStreamingRef.current || !isRespondingRef.current) {
            console.log('Streaming stopped by user, breaking loop');
            break;
          }

          // 解码流式数据
          const chunk = decoder.decode(value, { stream: true });
          // 累加到缓冲区并按SSE事件边界(\n\n)解析
          sseBuffer += chunk;

          const events = sseBuffer.split('\n\n');
          // 保留最后一个未完整的块在缓冲区
          sseBuffer = events.pop() || '';

          for (const evt of events) {
            // 在处理每个事件前也检查状态
            if (!isStreamingRef.current || !isRespondingRef.current) {
              console.log('Streaming stopped during event processing');
              break;
            }

            const lines = evt.split('\n');
            // 聚合多行 data: 为一个payload
            const payload = lines
              .map((l) => l.trim())
              .filter((l) => l.startsWith('data:'))
              .map((l) => l.slice(5).trim())
              .filter((v) => v && v !== '[DONE]')
              .join('');

            if (!payload) continue;

            try {
              const json = JSON.parse(payload);
              // 兼容 OpenAI/DeepSeek 样式
              const delta = json?.choices?.[0]?.delta;
              const piece =
                typeof delta?.content === 'string' ? delta.content : '';
              if (piece) {
                fullContent += piece;

                // 实时更新消息内容
                if (!hasStartedTyping) {
                  hasStartedTyping = true;
                  // 第一块数据到达时，开始打字效果
                  targetContentRef.current = fullContent;
                  startTypingEffect(0);
                } else {
                  // 后续数据块，继续打字效果
                  // 只更新目标内容，让打字循环自然继续
                  targetContentRef.current = fullContent;
                }

                // 自动滚动
                scrollToBottom();
              }
            } catch (_e) {
              // 忽略无法解析的片段
              continue;
            }
          }
        }
      } finally {
        reader.releaseLock();
        setCurrentStream(null);
        setIsStreaming(false);
      }

      // 流式接收完成，确保最终内容已保存
      if (fullContent.trim()) {
        // 停止打字效果前，先把最终内容写入
        setDisplayedContent(fullContent.trim());
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            lastMessage.content = fullContent.trim();
          }
          return newMessages;
        });

        // 停止打字效果
        if (typingTimerRef.current) {
          clearTimeout(typingTimerRef.current);
          typingTimerRef.current = null;
        }
        setIsTyping(false);

        // 保存完整的AI回复到历史记录
        const finalAiMessage: ChatMessage = {
          role: 'assistant',
          content: fullContent.trim(),
        };
        await chatHistoryManager.addMessage(chatDetail.userId, finalAiMessage);

        // 流结束时滚动到底部
        setTimeout(() => scrollToBottom(), 100);
      }
    } catch (error) {
      console.error('AI chat error:', error);

      // 显示错误消息
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: t('aiChatError'),
      };
      // 保存错误消息到历史记录
      if (chatDetail) {
        await chatHistoryManager.addMessage(chatDetail.userId, errorMessage);
        // 从历史记录重新加载消息
        const updatedHistory = chatHistoryManager.getHistory(chatDetail.userId);
        setMessages(updatedHistory);
      }
    } finally {
      setIsResponding(false);
      setIsStreaming(false);
      setIsTyping(false);
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 停止当前回答
  const handleStopResponding = async () => {
    // 先设置状态，确保流式循环能立即停止
    setIsResponding(false);
    setIsStreaming(false);
    setIsTyping(false);

    if (currentStream) {
      try {
        await currentStream.cancel();
      } catch (error) {
        console.error('Error canceling stream:', error);
      }
      setCurrentStream(null);
    }

    // 停止打字效果
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    if (responseTimerRef.current) {
      clearTimeout(responseTimerRef.current);
      responseTimerRef.current = null;
    }

    // 提示已停止
    const stopMessage: ChatMessage = {
      role: 'assistant',
      content: t('aiChatStopped'),
    };
    // 保存停止消息到历史记录
    if (chatDetail) {
      await chatHistoryManager.addMessage(chatDetail.userId, stopMessage);
      // 从历史记录重新加载消息
      const updatedHistory = chatHistoryManager.getHistory(chatDetail.userId);
      setMessages(updatedHistory);
    }
  };

  // 清空聊天历史
  const handleClearHistory = async () => {
    if (!chatDetail) return;

    await chatHistoryManager.clearHistory(chatDetail.userId);
    setMessages([
      {
        role: 'assistant',
        content: t('aiChatHistoryCleared').replace(
          '{userId}',
          chatDetail.userId
        ),
      },
    ]);
    // 延迟滚动到底部，确保DOM已更新
    setTimeout(() => scrollToBottom(), 100);
  };

  return (
    <FloatingContainer
      ref={containerRef}
      targetRef={targetRef}
      offsetX={-350}
      offsetY={-240}
      maxWidth='700px'
      maxHeight='660px'
      mask={true}
      className='bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 backdrop-blur-sm'
      onClose={handleContainerClose}
    >
      <div className='lato-font w-[700px] h-[660px] flex flex-col theme-bg-secondary backdrop-blur-sm rounded-lg shadow-xl border theme-border relative overflow-hidden theme-text-primary'>
        {/* 固定背景水印，不随内容滚动 */}
        <div className='absolute inset-0 z-0 flex items-center justify-center pointer-events-none select-none'>
          <div className='text-7xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent opacity-[0.06] -rotate-12 tracking-widest'>
            XHUNT
          </div>
        </div>

        {/* 头部 - 参考AiAnalysisTips的精致设计 */}
        <div className='sticky top-0 z-20 flex items-center justify-between px-4 py-2 border-b border-white/10 overflow-hidden backdrop-blur-xl'>
          {/* 背景装饰 */}
          <div className='absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none'></div>
          <div className='absolute inset-0 bg-gradient-to-br from-transparent via-white/[0.02] to-transparent pointer-events-none'></div>

          <div className='flex items-center gap-2 relative z-10'>
            <div className='relative'>
              <Sparkles className='w-4 h-4 text-blue-400' />
            </div>
            <h3 className='text-base font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight'>
              {t('aiChatTitle')}
            </h3>
          </div>

          <div className='flex items-center gap-2 relative z-10'>
            {/* 清空历史按钮 */}
            <button
              onClick={handleClearHistory}
              className='p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200 group cursor-pointer'
              title={t('aiChatClearHistory')}
            >
              <Trash2 className='w-4 h-4 theme-icon theme-icon-hover transition-colors' />
            </button>

            {/* 关闭按钮 */}
            <button
              onClick={handleClose}
              className='p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200 group cursor-pointer'
            >
              <X className='w-4 h-4 theme-icon theme-icon-hover transition-colors' />
            </button>
          </div>
        </div>

        {/* 消息区域（仅内容滚动） */}
        <div className='lato-font flex-1 overflow-y-auto p-4 space-y-4 relative z-10 custom-scrollbar ai-scrollbar'>
          {messages.length > 0 &&
            messages.map((message, index) => (
              <div
                key={index}
                className={`lato-font flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] p-2.5 rounded-lg relative group ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'theme-bg-tertiary theme-text-primary border theme-border'
                  }`}
                >
                  {message.role === 'user' ? (
                    <p className='text-sm leading-relaxed whitespace-pre-wrap'>
                      {message.content}
                    </p>
                  ) : (
                    <>
                      <div className='text-sm leading-relaxed'>
                        {/* 根据状态来决定显示方式 */}
                        {index === messages.length - 1 &&
                        (isTyping || isStreaming || isResponding) ? (
                          <div className='space-y-2'>
                            {/* 打字效果中：显示纯文本 */}
                            {isTyping && (
                              <div
                                className='whitespace-pre-wrap leading-tight'
                                style={{ lineHeight: '1.4' }}
                              >
                                {displayedContent || ''}
                                <span className='inline-block w-0.5 h-4 bg-blue-400 ml-0.5 animate-pulse'></span>
                              </div>
                            )}

                            {/* 等待接口返回状态 */}
                            {!isTyping && isResponding && !isStreaming && (
                              <div className='flex items-center gap-2 text-sm text-gray-500'>
                                <div className='relative'>
                                  <div className='w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin'></div>
                                  <div
                                    className='absolute inset-0 w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin'
                                    style={{ animationDelay: '-0.5s' }}
                                  ></div>
                                </div>
                                <span>{t('aiThinking')}</span>
                              </div>
                            )}

                            {/* 流式接收状态 - 只在没有内容时显示 */}
                            {!isTyping && isStreaming && !displayedContent && (
                              <div className='flex items-center gap-2 text-sm text-gray-500'>
                                <div className='flex space-x-1'>
                                  <div className='w-1 h-1 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse'></div>
                                  <div
                                    className='w-1 h-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse'
                                    style={{ animationDelay: '0.2s' }}
                                  ></div>
                                  <div
                                    className='w-1 h-1 bg-gradient-to-r from-pink-400 to-blue-400 rounded-full animate-pulse'
                                    style={{ animationDelay: '0.4s' }}
                                  ></div>
                                </div>
                                <span>{t('aiChatStreaming')}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          // 正常显示：使用Markdown渲染
                          <div
                            className='prose prose-sm max-w-none dark:prose-invert leading-tight'
                            style={
                              {
                                lineHeight: '1.4',
                                '--tw-prose-headings-margin-top': '0.5rem',
                                '--tw-prose-headings-margin-bottom': '0.25rem',
                                '--tw-prose-paragraph-margin-top': '0.25rem',
                                '--tw-prose-paragraph-margin-bottom': '0.25rem',
                                '--tw-prose-ul-margin-top': '0.25rem',
                                '--tw-prose-ul-margin-bottom': '0.25rem',
                                '--tw-prose-ol-margin-top': '0.25rem',
                                '--tw-prose-ol-margin-bottom': '0.25rem',
                                '--tw-prose-blockquote-margin-top': '0.25rem',
                                '--tw-prose-blockquote-margin-bottom':
                                  '0.25rem',
                                '--tw-prose-hr-margin-top': '0.5rem',
                                '--tw-prose-hr-margin-bottom': '0.5rem',
                              } as React.CSSProperties
                            }
                            dangerouslySetInnerHTML={{
                              __html: simpleMarkdownToHtml(message.content),
                            }}
                          />
                        )}
                      </div>

                      {/* 复制按钮 - 只在消息完成且非打字状态显示，且不是停止消息 */}
                      {(index !== messages.length - 1 ||
                        (!isTyping && !isStreaming && !isResponding)) &&
                      message.content !== t('aiChatStopped') ? (
                        <div className='flex justify-end mt-2'>
                          <button
                            onClick={() =>
                              handleCopyMessage(message.content, index)
                            }
                            className='flex items-center gap-1 px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 transition-all duration-200 text-xs'
                            title={t('aiChatCopy')}
                          >
                            {copiedMessageIndex === index ? (
                              <>
                                <Check className='w-3 h-3 text-green-800' />
                                <span className='text-green-800'>
                                  {t('aiChatCopied')}
                                </span>
                              </>
                            ) : (
                              <>
                                <Copy className='w-3 h-3 text-gray-400' />
                                <span className='text-gray-400'>
                                  {t('aiChatCopy')}
                                </span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            ))}

          {/* 自动滚动锚点 */}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入区域 - 完美对齐设计 */}
        <div className='p-3 border-t border-white/10 bg-white/5 backdrop-blur-sm'>
          <div className='flex items-center gap-2'>
            <div className='flex-1 relative'>
              <input
                type='text'
                value={inputValue}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= MAX_INPUT_LENGTH) {
                    setInputValue(value);
                  }
                }}
                onKeyPress={handleKeyPress}
                placeholder={
                  isResponding && !isStreaming
                    ? t('aiThinking')
                    : isStreaming
                    ? t('aiChatInputStreaming')
                    : t('aiChatInputPlaceholder')
                }
                className={`w-full h-10 px-3 border rounded-lg focus:outline-none text-sm shadow-sm transition-colors placeholder-gray-400 theme-bg-primary theme-text-primary theme-border ${
                  isResponding
                    ? 'opacity-70 cursor-not-allowed'
                    : 'focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20'
                }`}
                disabled={isResponding}
                maxLength={MAX_INPUT_LENGTH}
              />
            </div>
            {isResponding ? (
              <button
                onClick={handleStopResponding}
                className='h-10 w-10 rounded-lg transition-all duration-200 flex items-center justify-center shadow-sm bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100'
                title={t('aiChatPause')}
              >
                <Pause className='w-4 h-4' />
              </button>
            ) : (
              <button
                onClick={handleSendMessage}
                disabled={
                  !inputValue.trim() ||
                  inputValue.length < MIN_INPUT_LENGTH ||
                  isResponding ||
                  isStreaming
                }
                className='h-10 w-10 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-white rounded-lg hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-sm'
                title={t('aiChatSend')}
              >
                <Send className='w-4 h-4' />
              </button>
            )}
          </div>
        </div>
      </div>
    </FloatingContainer>
  );
}
