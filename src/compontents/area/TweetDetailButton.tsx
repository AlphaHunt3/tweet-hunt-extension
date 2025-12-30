import React, { useState, useRef, useEffect } from 'react';
import useShadowContainer from '~contents/hooks/useShadowContainer.ts';
import useTweetDetail from '~contents/hooks/useTweetDetail.ts';
import useCurrentUrl from '~contents/hooks/useCurrentUrl.ts';
import ReactDOM from 'react-dom';
import cssText from 'data-text:~/css/style.css';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useLockFn } from 'ahooks';
import { fetchAiContent, getTwitterAuthUrl } from '~contents/services/api';
import { AiContentResponse } from '~types';
import { AI_ANALYSIS_EVENT, AiAnalysisDetail } from './AiAnalysisTips.tsx';
import { openNewTab } from '~contents/utils';
import { useCrossPageSettings } from '~/utils/settingsManager.ts';

interface TweetDetailButtonProps {
  // 可以添加其他props
}

function _TweetDetailButton({}: TweetDetailButtonProps) {
  const shadowRoot = useShadowContainer({
    selector:
      "article[data-testid='tweet'][tabindex='-1'] button[data-testid='caret']",
    styleText: cssText,
    useSiblings: true,
    siblingsPosition: 'beforebegin',
  });

  const { t } = useI18n();
  const { isEnabled } = useCrossPageSettings();
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const [token] = useLocalStorage('@xhunt/token', '');
  const isLoggedIn = !!token;
  const { tweetId, isTweetDetail } = useTweetDetail();
  const currentUrl = useCurrentUrl();

  // AI 分析相关状态
  const [aiData, setAiData] = useState<AiContentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [progress, setProgress] = useState(0); // 0 ~ 1
  const timerRef = useRef<number | null>(null);
  const delayTimerRef = useRef<number | null>(null);
  const stage2StartRef = useRef<number | null>(null); // start time when entering 85%→99%
  const [buttonSize, setButtonSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [buttonRadius, setButtonRadius] = useState<number | null>(null);
  const [hasProgressStarted, setHasProgressStarted] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const updateButtonSize = () => {
    if (!buttonRef.current) return;
    const el = buttonRef.current;
    const rect = el.getBoundingClientRect();
    const cs = window.getComputedStyle(el);
    const rTopLeft = parseFloat(cs.borderTopLeftRadius || '0');
    // For rounded-full pills, radius ~ height/2; computed style should reflect px
    setButtonSize({ width: rect.width, height: rect.height });
    setButtonRadius(
      Number.isFinite(rTopLeft) && rTopLeft > 0 ? rTopLeft : rect.height / 2
    );
  };

  // 从URL中提取推文ID
  const extractTweetIdFromUrl = (url: string): string | null => {
    try {
      // 匹配类似 https://x.com/username/status/1963660907017605191 的URL
      const match = url.match(/\/status\/(\d+)/);
      return match ? match[1] : null;
    } catch (error) {
      return null;
    }
  };

  // 使用 useLockFn 防止重复请求
  const analyzeContent = useLockFn(async (text: string, tweetId: string) => {
    setIsLoading(true);
    try {
      setError(null);
      const response = await fetchAiContent(text, tweetId);

      if (response && Object.keys(response).length > 0) {
        setAiData(response);
        // 发送成功事件
        if (buttonRef.current) {
          const event = new CustomEvent<AiAnalysisDetail>(AI_ANALYSIS_EVENT, {
            detail: {
              type: 'success',
              data: response,
              element: buttonRef.current,
            },
          });
          window.dispatchEvent(event);
        }
      } else {
        setError(t('analysisFailed'));
        // 发送错误事件
        if (buttonRef.current) {
          const event = new CustomEvent<AiAnalysisDetail>(AI_ANALYSIS_EVENT, {
            detail: {
              type: 'error',
              error: t('analysisFailed'),
              element: buttonRef.current,
            },
          });
          window.dispatchEvent(event);
        }
      }
    } catch (err) {
      let errorMessage = t('networkError');

      // 兼容多种错误类型（Error、string、undefined、其他对象）
      const rawMessage =
        typeof err === 'string'
          ? err
          : err && typeof err === 'object' && 'message' in err
          ? typeof (err as { message?: unknown }).message === 'string'
            ? ((err as { message?: unknown }).message as string)
            : ''
          : '';

      if (rawMessage) {
        // 移除所有版本号前缀，获取实际的错误消息
        const cleanMessage = rawMessage.replace(/\[v[\d.]+\]\s*/g, '');

        // 如果是使用频率限制的错误消息，直接使用
        if (cleanMessage.includes('已使用') && cleanMessage.includes('次')) {
          errorMessage = cleanMessage;
        } else {
          // 尝试解析JSON格式的错误（备用方案）
          try {
            const errorMatch = cleanMessage.match(/\{.*\}/);
            if (errorMatch) {
              const errorData = JSON.parse(errorMatch[0]);
              if (errorData.error && errorData.message) {
                errorMessage = `${errorData.error}\n${errorData.message}`;
                if (errorData.resetTime) {
                  const resetDate = new Date(errorData.resetTime);
                  errorMessage += `\n重置时间：${resetDate.toLocaleString()}`;
                }
              }
            }
          } catch (parseError) {
            // JSON解析失败，使用默认错误消息
          }
        }
      }

      setError(errorMessage);
      // 发送错误事件
      if (buttonRef.current) {
        const event = new CustomEvent<AiAnalysisDetail>(AI_ANALYSIS_EVENT, {
          detail: {
            type: 'error',
            error: errorMessage,
            element: buttonRef.current,
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

  useEffect(() => {
    setAiData(null);
    setIsLoading(false);
    setError(null);
    setProgress(0);
    setHasProgressStarted(false);
    stage2StartRef.current = null;
  }, [tweetId]);

  // 监听 AI 分析面板的打开/关闭状态，保持按钮宽度稳定
  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<AiAnalysisDetail>;
      if (customEvent.detail) {
        if (
          customEvent.detail.element === buttonRef.current &&
          customEvent.detail.type === 'success'
        ) {
          setIsPanelOpen(true);
        } else if (customEvent.detail.element !== buttonRef.current) {
          // 如果事件来自其他按钮，关闭当前面板状态
          setIsPanelOpen(false);
        }
      }
    };
    window.addEventListener(AI_ANALYSIS_EVENT, handler);
    return () => {
      window.removeEventListener(AI_ANALYSIS_EVENT, handler);
    };
  }, []);

  // Observe button size to draw SVG border accurately
  useEffect(() => {
    // Try immediate measurement; if ref not ready, retry on next frame
    if (!buttonRef.current) {
      const raf = requestAnimationFrame(() => updateButtonSize());
      return () => cancelAnimationFrame(raf);
    }
    updateButtonSize();
    const el = buttonRef.current;
    // const ro = new ResizeObserver(() => updateButtonSize());
    // ro.observe(el);
    // const onResize = () => updateButtonSize();
    // window.addEventListener('resize', onResize);
    return () => {
      // ro.disconnect();
      // window.removeEventListener('resize', onResize);
    };
  }, []);

  // Handle progress timing with randomized increments (cap at 85%), start after 1s delay
  useEffect(() => {
    const CAP_STAGE1 = 0.85; // random increments up to 85%
    const CAP_STAGE2 = 0.99; // then 20s to 99%
    const STAGE2_DURATION_MS = 20000;

    if (isLoading) {
      // Ensure clean previous timers
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (delayTimerRef.current) {
        window.clearTimeout(delayTimerRef.current);
        delayTimerRef.current = null;
      }
      stage2StartRef.current = null;
      // Delay 1s before starting the visible progress
      delayTimerRef.current = window.setTimeout(() => {
        setHasProgressStarted(true);
        timerRef.current = window.setInterval(() => {
          setProgress((prev) => {
            // Stage 1: random ease to 85%
            if (prev < CAP_STAGE1) {
              const remaining = Math.max(0, CAP_STAGE1 - prev);
              const base = Math.max(0.004, remaining * 0.06);
              const jitter = 0.2 + Math.random() * 1.0; // 0.2 ~ 1.2
              if (Math.random() < 0.12) {
                return prev; // tiny pause
              }
              const delta = Math.min(remaining, base * jitter);
              const next = prev + delta;
              return Number(next.toFixed(4));
            }
            // Stage 2: linear over 20s to 99%
            if (prev < CAP_STAGE2) {
              if (!stage2StartRef.current) {
                stage2StartRef.current = performance.now();
              }
              const elapsed = performance.now() - stage2StartRef.current;
              const span = CAP_STAGE2 - CAP_STAGE1;
              const p =
                CAP_STAGE1 + Math.min(1, elapsed / STAGE2_DURATION_MS) * span;
              return Number(Math.min(p, CAP_STAGE2).toFixed(4));
            }
            // Hold at 99% until finished
            return CAP_STAGE2;
          });
        }, 120);
      }, 500);
    } else {
      // When loading ends, finish to 1 and then reset after a short delay
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
        // reset when nothing to show
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

  const clearError = () => {
    setError(null);
  };

  // 如果设置未启用，不显示AI分析按钮
  if (!isEnabled('showTweetAIAnalysis')) {
    return null;
  }

  // 如果不是推文详情页，返回空内容
  if (!isTweetDetail) {
    return null;
  }

  // 如果没有找到挂载点，返回空内容
  if (!shadowRoot) {
    return null;
  }

  // 点击时：若已有数据则直接展示悬浮框；否则触发分析
  const handleButtonClick = async () => {
    updateButtonSize();
    if (!isLoggedIn) {
      await redirectToLogin();
      return;
    }

    if (aiData && buttonRef.current) {
      const event = new CustomEvent<AiAnalysisDetail>(AI_ANALYSIS_EVENT, {
        detail: {
          type: 'success',
          data: aiData,
          element: buttonRef.current,
        },
      });
      window.dispatchEvent(event);
      return;
    }

    // 查找所有推文文本元素
    const tweetTextElements = document.querySelectorAll(
      "article[data-testid='tweet'] div[data-testid='tweetText']"
    );

    let textContent = '';

    if (tweetTextElements.length > 0) {
      // 优先使用推文文本元素
      const firstTweetElement = tweetTextElements[0];
      textContent = firstTweetElement.textContent?.trim() || '';
    } else {
      // 退而求其次，查找整个 article 标签
      const articleElements = document.querySelectorAll(
        "article[data-testid='tweet']"
      );

      if (articleElements.length > 0) {
        const firstArticleElement = articleElements[0];
        textContent = firstArticleElement.textContent?.trim() || '';
      } else {
        return;
      }
    }

    // 设置文本内容上限（例如 5000 字符）
    const MAX_TEXT_LENGTH = 5000;
    if (textContent.length > MAX_TEXT_LENGTH) {
      textContent = textContent.substring(0, MAX_TEXT_LENGTH);
    }

    if (!textContent) {
      return;
    }

    // 提取推文ID
    const tweetIdFromUrl = extractTweetIdFromUrl(currentUrl);

    if (!tweetIdFromUrl) {
      return;
    }

    try {
      await analyzeContent(textContent, tweetIdFromUrl);
    } catch (error) {
      // 错误已在 analyzeContent 中处理
    }
  };

  const handleMouseEnter = () => {
    // 只有在已有数据时才显示悬浮框
    if (aiData && buttonRef.current) {
      const event = new CustomEvent<AiAnalysisDetail>(AI_ANALYSIS_EVENT, {
        detail: {
          type: 'success',
          data: aiData,
          element: buttonRef.current,
        },
      });
      window.dispatchEvent(event);
    }
  };

  // 计算按钮显示文本
  const getButtonText = () => {
    if (isLoading) {
      return t('analyzing');
    }

    if (aiData) {
      return t('viewAnalysisResults');
    }

    return t('tweetAiAnalysis');
  };

  return ReactDOM.createPortal(
    <div
      data-theme={theme}
      className='inline-flex items-center'
      style={{ marginLeft: '4px' }}
    >
      <button
        ref={buttonRef}
        onClick={handleButtonClick}
        onMouseEnter={handleMouseEnter}
        disabled={isLoading}
        aria-label={getButtonText()}
        className={`relative group flex items-center justify-center px-3.5 py-1.5 rounded-full font-semibold text-xs transition-all duration-200 cursor-pointer min-w-[36px] text-white mr-3 shadow-sm hover:opacity-90 overflow-hidden ${
          isLoading && hasProgressStarted
            ? 'bg-slate-500'
            : 'bg-gradient-to-r from-blue-500 to-purple-500'
        } ${isLoading ? 'cursor-not-allowed pointer-events-none' : ''} ${
          isLoading && hasProgressStarted ? 'pr-10' : ''
        }`}
        style={{ overflow: 'hidden' }}
        // title={getButtonText()}
        // aria-label={getButtonText()}
      >
        {/* Progress fill (behind content) */}
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
        {/* Contrast veil to improve text readability over bright fill */}
        {/* {isLoading && hasProgressStarted ? (
          <span
            aria-hidden
            className='absolute inset-0'
            style={{
              background:
                'linear-gradient(to right, rgba(0,0,0,0.16), rgba(0,0,0,0.08))',
              zIndex: 2,
              pointerEvents: 'none',
            }}
          />
        ) : null} */}
        {/* <span
          className='pointer-events-none absolute inset-0 rounded-full ring-1 ring-white/10'
          style={{ zIndex: 3 }}
        ></span> */}
        <span
          className='relative flex items-center'
          style={{
            zIndex: 4,
          }}
        >
          <svg
            className='h-4 w-4 text-white'
            viewBox='0 0 1024 1024'
            xmlns='http://www.w3.org/2000/svg'
            aria-hidden='true'
          >
            <path
              d='M511.488 672.768h74.752L527.36 351.744H446.976l-174.08 320.512h74.24l36.352-73.728h116.736v0.512l11.264 73.728z m-103.424-126.464l56.32-112.128c4.608-8.704 7.68-17.92 10.24-27.136h2.048c-1.024 11.776-1.024 20.992 0 28.16l16.896 111.104H408.064zM682.496 351.744l-56.32 320.512h68.096l56.832-320.512zM1015.296 382.976c-8.704-33.28-36.352-55.808-68.096-59.904-74.24-171.008-243.712-285.184-435.2-285.184C294.912 37.376 105.984 184.32 52.224 394.24c-5.12 18.944 6.656 38.912 25.6 43.52 18.944 5.12 38.912-6.656 43.52-25.6 46.08-178.688 206.336-303.104 390.656-303.104 160.768 0 303.104 94.72 367.616 237.056-18.944 19.456-28.16 48.128-20.48 76.8C870.4 465.92 914.432 492.032 957.44 481.28c43.008-11.264 69.12-55.296 57.856-98.304zM945.664 586.24c-18.944-5.12-38.912 6.656-43.52 25.6-45.568 178.176-206.336 302.592-390.144 302.592-160.768 0-303.104-94.72-367.616-237.056 18.944-19.456 28.16-48.128 20.48-76.8-11.264-43.008-55.296-69.12-98.304-58.368-43.008 11.264-69.12 55.296-58.368 98.304 8.704 33.28 36.352 55.808 68.096 59.904 74.24 171.008 243.712 285.184 435.2 285.184 217.088 0 406.016-146.432 459.776-356.352 5.632-18.432-6.144-37.888-25.6-43.008z'
              fill='currentColor'
            />
          </svg>
          <span
            className={`overflow-hidden whitespace-nowrap transition-all duration-200 ${
              isPanelOpen
                ? 'ml-2 min-w-0 max-w-[120px] opacity-100'
                : 'ml-0 min-w-0 max-w-0 opacity-0 group-hover:ml-2 group-hover:max-w-[120px] group-hover:opacity-100 group-focus-visible:ml-2 group-focus-visible:max-w-[120px] group-focus-visible:opacity-100'
            }`}
          >
            {getButtonText()}
          </span>
        </span>
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
        {/* {aiData ? (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-white/80 ring-2 ring-purple-400/40 animate-pulse"></span>
        ) : null} */}
      </button>
    </div>,
    shadowRoot
  );
}

export default React.memo(_TweetDetailButton);
