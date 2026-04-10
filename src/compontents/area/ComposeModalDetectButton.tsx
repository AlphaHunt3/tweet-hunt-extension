import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import useShadowContainer from '~contents/hooks/useShadowContainer.ts';
import usePersistentPortalHost from '~contents/hooks/usePersistentPortalHost';
import useCurrentUrl from '~contents/hooks/useCurrentUrl';
import { subscribeToMutation } from '~contents/hooks/useGlobalMutationObserver';
import ReactDOM from 'react-dom';
import cssText from 'data-text:~/css/style.css';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useLockFn } from 'ahooks';
import { fetchAiDetect, fetchAiDetectQuota, getTwitterAuthUrl } from '~contents/services/api';
import { AiDetectResponse } from '~types';
import { AI_DETECT_EVENT, AiDetectDetail } from '../AiDetectTips.tsx';
import { openNewTab } from '~contents/utils';

const COMPOSE_MODAL_SELECTOR = "div[data-viewportview] button[data-testid='unsentButton']";
const INLINE_REPLY_SELECTOR = "div[data-testid='inline_reply_offscreen']";
const HOME_TIMELINE_SELECTOR = "div[data-testid='primaryColumn'] div.css-175oi2r.r-1h8ys4a";

// 从编辑器获取引用内容（attachments）
const getQuotedContent = (): string => {
  const attachments = document.querySelector("div[data-testid='attachments']");
  if (!attachments) return '';
  return attachments.textContent?.trim() || '';
};

// 从编辑器获取内容
const getComposeContent = (): string => {
  // 获取 Draft.js 编辑器根元素
  const editor = document.querySelector(
    "div[data-testid='tweetTextarea_0RichTextInputContainer'] div[class~='DraftEditor-root']"
  ) as HTMLElement | null;

  if (!editor) {
    return '';
  }

  // 获取所有文本块
  const contentBlocks = editor.querySelectorAll('div[data-block="true"]');
  const lines: string[] = [];

  contentBlocks.forEach((block) => {
    // 检查是否是空行（有 <br> 标签）
    const hasBr = block.querySelector('br[data-text="true"]');
    if (hasBr) {
      lines.push('');
      return;
    }

    // 提取该行的所有文本节点
    const textSpans = block.querySelectorAll('span[data-text="true"]');
    let lineText = '';

    textSpans.forEach((span) => {
      // 对于 emoji，背景图有内容的说明是emoji，但文本本身是emoji字符
      // 我们直接取 textContent，浏览器会正确处理
      const text = span.textContent || '';
      lineText += text;
    });

    lines.push(lineText);
  });

  // 拼接所有行，保留换行
  return lines.join('\n').trim();
};

// 通用的检测按钮组件 props
interface DetectButtonProps {
  selector: string;
  targetStyle?: string;
  disabledOpacity?: string;
  componentType: 'compose' | 'inlineReply' | 'homeTimeline';
}

function _DetectButton({ selector, targetStyle, disabledOpacity = 'opacity-40', componentType }: DetectButtonProps) {
  const shadowRoot = useShadowContainer({
    selector: selector,
    styleText: cssText,
    useSiblings: true,
    siblingsPosition: 'beforebegin',
    targetStyle
  });

  const portalHost = usePersistentPortalHost(shadowRoot);

  const { t, lang } = useI18n();
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const [token] = useLocalStorage('@xhunt/token', '');
  const isLoggedIn = !!token;

  // AI 探测相关状态
  const [aiData, setAiData] = useState<AiDetectResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<number | null>(null);
  const delayTimerRef = useRef<number | null>(null);
  const stage2StartRef = useRef<number | null>(null);
  const [hasProgressStarted, setHasProgressStarted] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [quota, setQuota] = useState<{ total: number; used: number; remaining: number } | null>(null);

  // 是否有内容可检测
  const [canDetect, setCanDetect] = useState(false);

  // 记录上次分析的内容，用于检测内容变化
  const lastAnalyzedContentRef = useRef<string>('');

  // 使用 ref 跟踪 aiData，避免闭包问题
  const aiDataRef = useRef<AiDetectResponse | null>(null);
  useEffect(() => {
    aiDataRef.current = aiData;
  }, [aiData]);

  // 监听编辑器内容变化：控制按钮状态 + 内容变化时重置检测
  useEffect(() => {
    if (!shadowRoot) return;

    const handleContentChange = () => {
      const currentContent = getComposeContent();
      const hasContent = currentContent.length > 0;

      // 更新按钮可用状态
      setCanDetect(hasContent);

      // 如果内容变化了且之前有分析结果，重置状态
      if (currentContent !== lastAnalyzedContentRef.current && aiDataRef.current) {
        setAiData(null);
        setError(null);
        lastAnalyzedContentRef.current = '';
        // 通知外部组件关闭结果面板
        const event = new CustomEvent<AiDetectDetail>(AI_DETECT_EVENT, {
          detail: { type: 'reset', componentType },
        });
        window.dispatchEvent(event);
      }
    };

    // 初始检查
    handleContentChange();

    // 订阅编辑器内容变化
    const unsubscribe = subscribeToMutation(
      () => {
        handleContentChange();
      },
      {
        childList: true,
        subtree: true,
        characterData: true,
      },
      {
        debounce: 200,
        debugName: 'ComposeModalContentChange',
      }
    );

    return unsubscribe;
  }, [shadowRoot]);

  // 使用 useLockFn 防止重复请求
  const analyzeContent = useLockFn(async (content: string, quotedContent?: string) => {
    setIsLoading(true);
    try {
      setError(null);
      const response = await fetchAiDetect({
        content_type: 'Tweet',
        content_body: content,
        ...(quotedContent ? { quoted_content: quotedContent } : {}),
      });

      if (response) {
        setAiData(response);
        // 记录本次分析的内容
        lastAnalyzedContentRef.current = content;
        // 更新配额信息
        const newQuota = quota
          ? { ...quota, used: quota.used + 1, remaining: Math.max(0, quota.remaining - 1) }
          : undefined;
        setQuota(newQuota || null);
        // 发送成功事件
        if (buttonRef.current) {
          const event = new CustomEvent<AiDetectDetail>(AI_DETECT_EVENT, {
            detail: {
              type: 'success',
              data: response,
              element: buttonRef.current,
              quota: newQuota,
              componentType,
            },
          });
          window.dispatchEvent(event);
        }
      } else {
        setError(t('analysisFailed'));
        if (buttonRef.current) {
          const event = new CustomEvent<AiDetectDetail>(AI_DETECT_EVENT, {
            detail: {
              type: 'error',
              error: t('analysisFailed'),
              element: buttonRef.current,
              componentType,
            },
          });
          window.dispatchEvent(event);
        }
      }
    } catch (err) {
      let errorMessage = t('networkError');

      const rawMessage =
        typeof err === 'string'
          ? err
          : err && typeof err === 'object' && 'message' in err
            ? typeof (err as { message?: unknown }).message === 'string'
              ? ((err as { message?: unknown }).message as string)
              : ''
            : '';

      if (rawMessage) {
        const cleanMessage = rawMessage.replace(/\[v[\d.]+\]\s*/g, '');
        if (cleanMessage.includes('已使用') && cleanMessage.includes('次')) {
          errorMessage = cleanMessage;
        }
      }

      setError(errorMessage);
      if (buttonRef.current) {
        const event = new CustomEvent<AiDetectDetail>(AI_DETECT_EVENT, {
          detail: {
            type: 'error',
            error: errorMessage,
            element: buttonRef.current,
            componentType,
          },
        });
        window.dispatchEvent(event);
      }
    } finally {
      setIsLoading(false);
    }
  });

  const redirectToLogin = useLockFn(async () => {
    const ret = await getTwitterAuthUrl();
    if (ret?.url) {
      openNewTab(ret.url);
    }
  });

  // 监听 AI 探测面板的打开/关闭状态
  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<AiDetectDetail>;
      if (customEvent.detail) {
        if (
          customEvent.detail.element === buttonRef.current &&
          customEvent.detail.type === 'success'
        ) {
          setIsPanelOpen(true);
        } else if (customEvent.detail.element !== buttonRef.current) {
          setIsPanelOpen(false);
        }
      }
    };
    window.addEventListener(AI_DETECT_EVENT, handler);
    return () => {
      window.removeEventListener(AI_DETECT_EVENT, handler);
    };
  }, []);

  // 处理进度条动画
  useEffect(() => {
    const CAP_STAGE1 = 0.85;
    const CAP_STAGE2 = 0.99;
    const STAGE2_DURATION_MS = 20000;

    if (isLoading) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (delayTimerRef.current) {
        window.clearTimeout(delayTimerRef.current);
        delayTimerRef.current = null;
      }
      stage2StartRef.current = null;

      delayTimerRef.current = window.setTimeout(() => {
        setHasProgressStarted(true);
        timerRef.current = window.setInterval(() => {
          setProgress((prev) => {
            if (prev < CAP_STAGE1) {
              const remaining = Math.max(0, CAP_STAGE1 - prev);
              const base = Math.max(0.004, remaining * 0.06);
              const jitter = 0.2 + Math.random() * 1.0;
              if (Math.random() < 0.12) {
                return prev;
              }
              const delta = Math.min(remaining, base * jitter);
              const next = prev + delta;
              return Number(next.toFixed(4));
            }
            if (prev < CAP_STAGE2) {
              if (!stage2StartRef.current) {
                stage2StartRef.current = performance.now();
              }
              const elapsed = performance.now() - stage2StartRef.current;
              const span = CAP_STAGE2 - CAP_STAGE1;
              const p = CAP_STAGE1 + Math.min(1, elapsed / STAGE2_DURATION_MS) * span;
              return Number(Math.min(p, CAP_STAGE2).toFixed(4));
            }
            return CAP_STAGE2;
          });
        }, 120);
      }, 500);
    } else {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (delayTimerRef.current) {
        window.clearTimeout(delayTimerRef.current);
        delayTimerRef.current = null;
      }
      if (progress < 1 && (aiData || error)) {
        setProgress(1);
        window.setTimeout(() => setProgress(0), 600);
      } else if (!aiData && !error) {
        setProgress(0);
      }
      setHasProgressStarted(false);
      stage2StartRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (delayTimerRef.current) {
        window.clearTimeout(delayTimerRef.current);
        delayTimerRef.current = null;
      }
    };
  }, [isLoading, aiData, error]);

  // 如果没有找到挂载点，返回空内容
  if (!shadowRoot || !portalHost) {

    return null;
  }

  // 点击时：若已有数据则直接展示悬浮框；否则触发分析
  const handleButtonClick = async () => {
    if (!isLoggedIn) {
      // 先询问用户是否保存了草稿，避免登录后刷新丢失
      const confirmMessage = lang === 'zh'
        ? '跳转登录前，请确保您已保存推文内容或存储为草稿，避免登录后刷新导致内容丢失。\n\n是否继续跳转登录？'
        : 'Before redirecting to login, please make sure you have saved your tweet content or stored it as a draft to avoid losing it after the page refreshes.\n\nContinue to login?';
      
      if (window.confirm(confirmMessage)) {
        await redirectToLogin();
      }
      return;
    }

    if (aiData && buttonRef.current) {
      const event = new CustomEvent<AiDetectDetail>(AI_DETECT_EVENT, {
        detail: {
          type: 'success',
          data: aiData,
          element: buttonRef.current,
          quota: quota || undefined,
          componentType,
        },
      });
      window.dispatchEvent(event);
      return;
    }

    const content = getComposeContent();
    if (!content) {
      setError(t('noContentToAnalyze'));
      if (buttonRef.current) {
        const event = new CustomEvent<AiDetectDetail>(AI_DETECT_EVENT, {
          detail: {
            type: 'error',
            error: t('noContentToAnalyze'),
            element: buttonRef.current,
            componentType,
          },
        });
        window.dispatchEvent(event);
      }
      return;
    }

    // 获取引用内容
    const quotedContent = getQuotedContent();

    try {
      await analyzeContent(content, quotedContent);
    } catch (error) {
      // 错误已在 analyzeContent 中处理
    }
  };

  const handleMouseEnter = () => {
    if (aiData && buttonRef.current) {
      const event = new CustomEvent<AiDetectDetail>(AI_DETECT_EVENT, {
        detail: {
          type: 'success',
          data: aiData,
          element: buttonRef.current,
          quota: quota || undefined,
          componentType,
        },
      });
      window.dispatchEvent(event);
    }
  };

  // 计算按钮显示文本
  const getButtonText = () => {
    if (isLoading) {
      return t('aiDetecting');
    }
    if (aiData) {
      return t('viewDetectResults');
    }
    return t('aiDetect');
  };

  return ReactDOM.createPortal(
    <div
      data-theme={theme}
      className='inline-flex items-center'
      style={{ marginRight: '8px', direction: 'ltr' }}
    >
      <button
        ref={buttonRef}
        onClick={handleButtonClick}
        onMouseEnter={handleMouseEnter}
        disabled={isLoading || !canDetect}
        aria-label={getButtonText()}
        className={`relative group flex items-center justify-center px-3.5 py-1.5 rounded-full font-semibold text-xs transition-all duration-200 min-w-[36px] text-white shadow-sm overflow-hidden ${isLoading && hasProgressStarted
          ? 'bg-slate-500'
          : 'bg-gradient-to-r from-blue-500 to-purple-500'
          } ${isLoading || !canDetect ? 'cursor-not-allowed pointer-events-none' : 'cursor-pointer hover:opacity-90'} ${isLoading && hasProgressStarted ? 'pr-10' : ''} ${!canDetect ? disabledOpacity : ''}
          `}
        style={{ overflow: 'hidden' }}
      >
        {/* Progress fill */}
        {isLoading && hasProgressStarted ? (
          <span
            aria-hidden
            className='absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-purple-500'
            style={{
              width: `${Math.round(Math.min(progress, 0.99) * 100)}%`,
              transition: 'width 120ms linear',
              zIndex: 1,
            }}
          />
        ) : null}
        <span
          className='relative flex items-center'
          style={{ zIndex: 4 }}
        >
          <svg
            className='h-4 w-4 text-white'
            viewBox='0 0 1024 1024'
            xmlns='http://www.w3.org/2000/svg'
            aria-hidden='true'
          >
            <path
              d='M668.8 323.2V704c0 19.2 16 35.2 35.2 35.2s35.2-16 35.2-35.2V323.2C736 304 720 288 700.8 288c-16 0-32 16-32 35.2z m-272-12.8L256 662.4c-6.4 16 0 38.4 19.2 44.8 16 6.4 38.4 0 44.8-19.2l35.2-86.4H521.6l41.6 86.4c6.4 16 28.8 25.6 44.8 16s25.6-28.8 16-44.8l-160-352c-16-25.6-54.4-25.6-67.2 3.2z m-16 224l51.2-124.8 57.6 124.8h-108.8z'
              fill='currentColor'
            />
            <path
              d='M857.6 128l41.6 16c57.6 25.6 92.8 80 96 137.6v464c0 60.8-38.4 115.2-92.8 137.6l-44.8 16c-9.6 25.6-32 41.6-60.8 41.6-16 0-32-6.4-44.8-19.2-25.6-25.6-22.4-64 3.2-89.6 25.6-25.6 64-25.6 89.6 0l35.2-12.8c28.8-12.8 51.2-44.8 51.2-76.8V281.6c0-32-22.4-64-51.2-76.8l-38.4-16c-12.8 9.6-25.6 16-41.6 16s-32-6.4-44.8-19.2c-12.8-9.6-19.2-25.6-19.2-41.6 0-35.2 25.6-64 60.8-64 28.8 0 54.4 19.2 60.8 48zM192 841.6c12.8-16 28.8-22.4 48-22.4 35.2 0 64 28.8 60.8 64 0 35.2-28.8 64-64 64-25.6 0-48-16-57.6-38.4l-57.6-19.2C70.4 864 35.2 812.8 32 755.2v-480c3.2-57.6 38.4-108.8 92.8-131.2l54.4-19.2c6.4-25.6 32-44.8 60.8-44.8h3.2c35.2 0 60.8 28.8 60.8 64s-28.8 64-64 64c-16-3.2-35.2-9.6-44.8-22.4l-48 19.2C118.4 217.6 96 243.2 96 275.2v480c3.2 32 22.4 57.6 51.2 70.4l44.8 16z'
              fill='currentColor'
            />
          </svg>
          <span
            className={`overflow-hidden whitespace-nowrap transition-all duration-200 ${isPanelOpen
              ? 'ml-2 min-w-0 max-w-[120px] opacity-100'
              : 'ml-0 min-w-0 max-w-0 opacity-0 group-hover:ml-2 group-hover:max-w-[120px] group-hover:opacity-100 group-focus-visible:ml-2 group-focus-visible:max-w-[120px] group-focus-visible:opacity-100'
              }`}
          >
            {getButtonText()}
          </span>
        </span>
        {/* 进度百分比 */}
        {isLoading && hasProgressStarted ? (
          <span
            className='pointer-events-none absolute right-2 text-xs font-semibold'
            style={{
              color: '#f8fafc',
              zIndex: 5,
            }}
          >
            {(() => {
              const p = Math.round(Math.min(progress, 0.99) * 100);
              return p > 0 ? `${p}%` : '';
            })()}
          </span>
        ) : null}
      </button>
    </div>,
    portalHost
  );
}

// 原来的 Compose Modal 检测按钮
function _ComposeModalDetectButton() {
  const [showAiDetectButton] = useLocalStorage('@settings/showAiDetectButton', true);
  
  if (!showAiDetectButton) {
    return null;
  }
  
  return <_DetectButton selector={COMPOSE_MODAL_SELECTOR} componentType='compose' />;
}

// 内联回复检测按钮 - 只在帖子详情页显示 (/status/)
function _InlineReplyDetectButton() {
  const currentUrl = useCurrentUrl();
  const [showAiDetectButton] = useLocalStorage('@settings/showAiDetectButton', true);

  const isStatusPage = useMemo(() => /\/status\/\d+/.test(currentUrl), [currentUrl]);

  // 如果开关关闭，不渲染
  if (!showAiDetectButton) {
    return null;
  }

  // 如果不是帖子详情页，不渲染
  if (!isStatusPage) {
    return null;
  }

  return <_DetectButton selector={INLINE_REPLY_SELECTOR} componentType='inlineReply' targetStyle={"direction: rtl; height:0; margin-top: 8px; margin-right:8px;"} disabledOpacity='opacity-0' />;
}

// Home Timeline 检测按钮 - 只在首页显示 (/home)
function _HomeTimelineDetectButton() {
  const currentUrl = useCurrentUrl();
  const [showAiDetectButton] = useLocalStorage('@settings/showAiDetectButton', true);
  const isHomePage = useMemo(() => /\/home/.test(currentUrl), [currentUrl]);

  // 如果开关关闭，不渲染
  if (!showAiDetectButton) {
    return null;
  }

  // 如果不是首页，不渲染
  if (!isHomePage) {
    return null;
  }

  return <_DetectButton selector={HOME_TIMELINE_SELECTOR} componentType='homeTimeline' targetStyle={"direction: rtl; height:0; margin-top: 8px; margin-right:8px;"} disabledOpacity='opacity-0' />;
}

export const ComposeModalDetectButton = React.memo(_ComposeModalDetectButton);
export const InlineReplyDetectButton = React.memo(_InlineReplyDetectButton);
export const HomeTimelineDetectButton = React.memo(_HomeTimelineDetectButton);
