import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  FloatingContainer,
  FloatingContainerRef,
} from '~/compontents/FloatingContainer';
import { X, Send, Pause, Trash2, Copy, Check } from 'lucide-react';
import { fetchKolChat, fetchKolChatList } from '~/contents/services/api';
import type { KolChatItem } from '~types';
import { chatHistoryManager } from '~/storage/chatHistoryManager';
import { ChatMessage } from '~/types';
import { useI18n } from '~contents/hooks/i18n.ts';
import usePlacementTracking from '~contents/hooks/usePlacementTracking';
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

export type KolType = 'official' | 'unofficial';

export interface AiChatDetail {
  userId: string;
  element: HTMLElement;
  kolType?: KolType;
  perspectiveName?: string;
}

export function KolAiChatDialog() {
  const { t, lang } = useI18n();
  const { displayName, avatar } = usePlacementTracking();
  const [chatDetail, setChatDetail] = useState<AiChatDetail | null>(null);
  const [kolType, setKolType] = useState<KolType>('unofficial');
  const [perspectiveName, setPerspectiveName] = useState<string>('');
  const targetRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<FloatingContainerRef>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isResponding, setIsResponding] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [displayedContent, setDisplayedContent] = useState<string>('');
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(
    null
  );
  // KOL ID 映射缓存
  const kolListRef = useRef<KolChatItem[]>([]);

  // 字数限制配置
  const MAX_INPUT_LENGTH = 1000; // 最大输入字数
  const MIN_INPUT_LENGTH = 1; // 最小输入字数

  // 使用 useRef 来避免闭包问题
  // 注意：可能存储 setTimeout 或 requestAnimationFrame 的返回值
  const typingTimerRef = useRef<number | null>(null);
  const isAnimationFrameRef = useRef<boolean>(false); // 标记当前是否是 requestAnimationFrame
  const typingIndexRef = useRef<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const targetContentRef = useRef<string>('');
  const isRespondingRef = useRef<boolean>(false);
  const isUserScrolledUpRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastScrollTimeRef = useRef<number>(0); // 上次滚动时间，用于节流

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
    isRespondingRef.current = isResponding;
  }, [isResponding]);

  // 同步打字状态到ref，避免闭包问题
  const isTypingRef = useRef<boolean>(false);
  useEffect(() => {
    isTypingRef.current = isTyping;
  }, [isTyping]);

  // 检查是否在底部（允许 80px 误差）
  const isNearBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    const threshold = 80;
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  }, []);

  // 自动滚动到底部
  const scrollToBottom = useCallback((behavior: 'smooth' | 'auto' = 'smooth') => {
    if (!isUserScrolledUpRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }
  }, []);

  // 共享的打字循环函数
  const typeNextChar = useCallback(() => {
    const currentIndex = typingIndexRef.current;
    const currentTarget = targetContentRef.current;

    if (currentIndex < currentTarget.length) {
      // 打字速度与步长（固定为逐字，以避免"成坨"视觉）
      const charsToType = 1;
      const progress = currentIndex / Math.max(1, currentTarget.length);
      // 随进度稍调速度，但不合并字符
      const typingSpeed = progress > 0.7 ? 10 : progress > 0.5 ? 14 : 18;

      const newContent = currentTarget.slice(0, currentIndex + charsToType);
      setDisplayedContent(newContent);
      typingIndexRef.current = currentIndex + charsToType;

      // 打字时自动滚动（如果用户在底部）- 每 200ms 最多滚一次，避免抽搐
      const now = Date.now();
      if (!isUserScrolledUpRef.current && isNearBottom() && now - lastScrollTimeRef.current > 200) {
        lastScrollTimeRef.current = now;
        scrollToBottom('auto');
      }

      typingTimerRef.current = window.setTimeout(typeNextChar, typingSpeed);
      isAnimationFrameRef.current = false; // setTimeout
    } else {
      // 已打完所有内容
      setIsTyping(false);
      typingTimerRef.current = null;
    }
  }, [isNearBottom, scrollToBottom]);

  // 打字效果函数 - 动态速度调整
  const startTypingEffect = useCallback(
    (startIndex: number = 0) => {
      // 清理之前的定时器（统一处理 setTimeout 和 requestAnimationFrame）
      if (typingTimerRef.current) {
        if (isAnimationFrameRef.current) {
          window.cancelAnimationFrame(typingTimerRef.current);
        } else {
          clearTimeout(typingTimerRef.current);
        }
        typingTimerRef.current = null;
        isAnimationFrameRef.current = false;
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
        // 保存 KOL 类型和展示名称
        setKolType(detail.kolType || 'unofficial');
        setPerspectiveName(detail.perspectiveName || detail.userId);

        // 加载聊天历史
        const history = chatHistoryManager.getHistory(detail.userId);
        if (history.length > 0) {
          setMessages(history);
          // 延迟滚动到底部，确保DOM已更新
          setTimeout(() => scrollToBottom(), 100);
        } else {
          // 如果没有历史记录，显示欢迎消息
          const perspectiveName = detail.perspectiveName || detail.userId;
          const welcomeContent = detail.kolType === 'official'
            ? t('aiChatWelcomeOfficial').replace('{name}', perspectiveName)
            : t('aiChatWelcome').replace('{perspective}', perspectiveName);
          const welcomeMessage: ChatMessage = {
            role: 'assistant',
            content: welcomeContent,
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
    setIsTyping(false);

    // 如果在请求中，取消请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // 停止打字效果
    if (typingTimerRef.current) {
      if (isAnimationFrameRef.current) {
        window.cancelAnimationFrame(typingTimerRef.current);
      } else {
        clearTimeout(typingTimerRef.current);
      }
      typingTimerRef.current = null;
      isAnimationFrameRef.current = false;
    }

    containerRef.current?.hide();
    setChatDetail(null);
    setMessages([]);
    setCopiedMessageIndex(null);
  }, []);

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

  // 根据 twitter_handle 查找 KOL ID
  const findKolIdByHandle = useCallback((handle: string): string | undefined => {
    const normalizedHandle = handle.toLowerCase().replace(/^@/, '');
    const kol = kolListRef.current.find(
      (k) => k.twitter_handle.toLowerCase() === normalizedHandle
    );
    return kol?.id;
  }, []);

  // 加载 KOL 列表
  useEffect(() => {
    const loadKolList = async () => {
      const list = await fetchKolChatList();
      if (list) {
        kolListRef.current = list;
      }
    };
    loadKolList();
  }, []);

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

    // 查找当前用户的 KOL ID
    const kolId = findKolIdByHandle(chatDetail.userId);
    if (!kolId) {
      // 如果当前用户不在 KOL 列表中，显示错误
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: t('aiChatUnsupportedKol'),
      };
      await chatHistoryManager.addMessage(chatDetail.userId, errorMessage);
      const updatedHistory = chatHistoryManager.getHistory(chatDetail.userId);
      setMessages(updatedHistory);
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

    try {
      // 获取完整的聊天历史（用于 KOL Chat 接口）
      const fullHistory = chatHistoryManager.getHistory(chatDetail.userId);
      // 转换为 KOL Chat 格式（排除空内容和报错信息）
      const messagesForApi = fullHistory
        .filter((m) => {
          if (!m.content.trim()) return false;
          // 过滤掉报错类消息（避免把错误提示发给 AI）
          const content = m.content.toLowerCase();
          const errorPatterns = [
            '今日已使用',
            'you have used',
            'quota exceeded',
            '暂不支持',
            'not available',
            '服务暂时不可用',
            'service is temporarily unavailable',
            '请求参数错误',
            'invalid request',
            'ai chat error',
            '抱歉，ai 分身',
            'sorry, the ai avatar',
          ];
          return !errorPatterns.some((pattern) => content.includes(pattern.toLowerCase()));
        })
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

      // 调用 KOL Chat 接口（非流式）
      abortControllerRef.current = new AbortController();
      const response = await fetchKolChat(kolId, messagesForApi, abortControllerRef.current.signal);
      abortControllerRef.current = null;

      if (!response) {
        throw new Error('Failed to get AI response');
      }
      console.log(response, "respones")
      // 处理错误码
      if (response.code !== 200) {
        let errorContent = t('aiChatError');
        if (response.code === 429) {
          // 超过限额 - 优先使用后端返回的消息
          const backendMessage = lang === 'zh' ? response.message : (response.message_en || response.message);
          if (backendMessage) {
            // 如果有重置时间，附加到消息后面
            if (response.resetTime) {
              const resetTimeStr = new Date(response.resetTime).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US');
              errorContent = `${backendMessage} (${lang === 'zh' ? '恢复时间' : 'Reset'}: ${resetTimeStr})`;
            } else {
              errorContent = backendMessage;
            }
          } else {
            const resetTime = response.resetTime
              ? new Date(response.resetTime).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US')
              : '';
            errorContent = resetTime
              ? t('aiChatQuotaExceededWithTime').replace('{time}', resetTime)
              : t('aiChatQuotaExceeded');
          }
        } else if (response.code === 400) {
          errorContent = response.message || t('aiChatInvalidParams');
        } else if (response.code === 521) {
          errorContent = response.message || t('aiChatUnsupportedKol');
        } else if (response.code === 503) {
          errorContent = response.message || t('aiChatServiceUnavailable');
        } else if (response.message) {
          errorContent = response.message;
        }

        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: errorContent,
        };
        await chatHistoryManager.addMessage(chatDetail.userId, errorMessage);
        const updatedHistory = chatHistoryManager.getHistory(chatDetail.userId);
        setMessages(updatedHistory);
        return;
      }

      const reply = response.data?.reply;
      if (!reply) {
        throw new Error('Empty response from AI');
      }

      // 先更新 messages 状态，让消息内容立即生效（避免打字完成后内容消失）
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          lastMessage.content = reply;
        }
        return newMessages;
      });

      // 设置目标内容并开始打字效果
      targetContentRef.current = reply;
      startTypingEffect(0);

      // 自动滚动
      scrollToBottom();

      // 保存完整的AI回复到历史记录
      const finalAiMessage: ChatMessage = {
        role: 'assistant',
        content: reply,
      };
      await chatHistoryManager.addMessage(chatDetail.userId, finalAiMessage);

      // 延迟滚动到底部
      setTimeout(() => scrollToBottom(), 100);
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
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 停止当前回答（仅停止打字效果，因为是非流式）
  const handleStopResponding = async () => {
    // 如果在请求中，取消请求
    if (isRespondingRef.current && abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // 停止响应状态
    setIsResponding(false);
    // 停止打字效果
    setIsTyping(false);

    if (typingTimerRef.current) {
      if (isAnimationFrameRef.current) {
        window.cancelAnimationFrame(typingTimerRef.current);
      } else {
        clearTimeout(typingTimerRef.current);
      }
      typingTimerRef.current = null;
      isAnimationFrameRef.current = false;
    }

    // 立即显示完整内容（如果有）
    if (targetContentRef.current) {
      setDisplayedContent(targetContentRef.current);
      // 更新消息状态，让完整内容显示
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          lastMessage.content = targetContentRef.current;
        }
        return newMessages;
      });
      // 保存完整内容到历史记录
      if (chatDetail) {
        const finalMessage: ChatMessage = {
          role: 'assistant',
          content: targetContentRef.current,
        };
        await chatHistoryManager.addMessage(chatDetail.userId, finalMessage);
      }
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
      offsetX={-300}
      offsetY={-160}
      maxWidth='680px'
      maxHeight='550px'
      mask={true}
      className='bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 backdrop-blur-sm'
      onClose={handleContainerClose}
    >
      <div className='lato-font w-[680px] h-[550px] flex flex-col theme-bg-secondary backdrop-blur-sm rounded-lg shadow-xl border theme-border relative overflow-hidden theme-text-primary'>
        {/* 固定背景水印，不随内容滚动 */}
        <div className='absolute inset-0 z-0 flex items-center justify-center pointer-events-none select-none'>
          <div className='text-7xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent opacity-[0.06] -rotate-12 tracking-widest'>
            XHUNT
          </div>
        </div>

        {/* 头部 - 参考AiAnalysisTips的精致设计 */}
        <div className='sticky top-0 z-20 flex items-center justify-between px-4 py-2 border-b theme-border overflow-hidden backdrop-blur-xl'>
          {/* 背景装饰 */}
          <div className='absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none'></div>
          <div className='absolute inset-0 bg-gradient-to-br from-transparent via-white/[0.02] to-transparent pointer-events-none'></div>

          <div className='flex items-center gap-3 relative z-10'>
            {/* 用户头像 - AI 分身风格滤镜 */}
            {avatar && (
              <div className='relative group'>
                {/* 外层蓝紫光晕效果 */}
                <div className='absolute inset-0 w-8 h-8 rounded-full bg-gradient-to-r from-blue-500/40 via-purple-500/40 to-pink-500/40 blur-md animate-pulse'></div>
                {/* 头像图片 - 应用亮丽 AI 风格滤镜 */}
                <img
                  src={avatar}
                  alt={displayName || ''}
                  className='relative w-8 h-8 rounded-full object-cover border-2 border-blue-400/50 shadow-[0_0_12px_rgba(139,92,246,0.4)]'
                  style={{
                    filter: 'saturate(1.2) contrast(1.05) brightness(1.05)',
                  }}
                />
                {/* AI 蓝紫遮罩 */}
                <div className='absolute inset-0 w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500/15 via-transparent to-purple-500/15 pointer-events-none'></div>
                {/* 右下角绿色在线状态指示器 */}
                <div className='absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-white dark:border-gray-800 shadow-sm'></div>
              </div>
            )}
            <div className='flex flex-col'>
              <h3 className='text-sm font-bold theme-text-primary'>
                {perspectiveName || displayName || t('aiChatTitle')}
              </h3>
              <span className='text-[10px] theme-text-secondary/70'>
                @{chatDetail?.userId}
              </span>
            </div>
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

        {/* 免责声明横幅 */}
        <div className={`px-4 py-2 text-xs text-center ${kolType === 'official'
          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
          }`}>
          {kolType === 'official'
            ? t('aiDisclaimerOfficial')
            : t('aiDisclaimerUnofficial')}
        </div>

        {/* 消息区域（仅内容滚动） */}
        <div
          ref={messagesContainerRef}
          className='lato-font flex-1 overflow-y-auto p-4 space-y-4 relative z-10 custom-scrollbar ai-scrollbar'
          onScroll={() => {
            // 检测用户是否手动向上滚动
            isUserScrolledUpRef.current = !isNearBottom();
          }}
        >
          {messages.length > 0 &&
            messages.map((message, index) => (
              <div
                key={index}
                className={`lato-font flex ${message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
              >
                <div
                  className={`max-w-[80%] p-2.5 rounded-lg relative group ${message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'theme-bg-tertiary theme-text-primary'
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
                          (isTyping || isResponding) ? (
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
                            {!isTyping && isResponding && (
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

                      {/* 复制按钮 - 只在消息完成且非打字状态显示 */}
                      {(index !== messages.length - 1 ||
                        (!isTyping && !isResponding)) &&
                        message.content !== t('aiChatStopped') ? (
                        <div className='flex justify-end mt-2'>
                          <button
                            onClick={() =>
                              handleCopyMessage(message.content, index)
                            }
                            className='flex items-center gap-1 px-2 py-1 rounded-md bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-all duration-200 text-xs opacity-60 hover:opacity-100'
                            title={t('aiChatCopy')}
                          >
                            {copiedMessageIndex === index ? (
                              <>
                                <Check className='w-3 h-3 text-green-500' />
                                <span className='text-green-500'>
                                  {t('aiChatCopied')}
                                </span>
                              </>
                            ) : (
                              <>
                                <Copy className='w-3 h-3' />
                                <span>{t('aiChatCopy')}</span>
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
                  isResponding
                    ? t('aiThinking')
                    : t('aiChatInputPlaceholder')
                }
                className={`w-full h-10 px-3 border rounded-lg focus:outline-none text-sm shadow-sm transition-colors placeholder-gray-400 theme-bg-primary theme-text-primary theme-border ${isResponding
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
                  isResponding
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
