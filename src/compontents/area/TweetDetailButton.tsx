import React, { useState, useRef, useEffect } from 'react';
import useShadowContainer from '~contents/hooks/useShadowContainer.ts';
import useTweetDetail from '~contents/hooks/useTweetDetail.ts';
import ReactDOM from 'react-dom';
import cssText from 'data-text:~/css/style.css';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useLockFn } from 'ahooks';
import { fetchAiContent, getTwitterAuthUrl } from '~contents/services/api';
import { AiContentData } from '~types';
import { AI_ANALYSIS_EVENT, AiAnalysisDetail } from './AiAnalysisTips.tsx';
import { openNewTab, windowGtag } from '~contents/utils';

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
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const [token] = useLocalStorage('@xhunt/token', '');
  const isLoggedIn = !!token;
  const { tweetId, isTweetDetail } = useTweetDetail();

  // AI 分析相关状态
  const [aiData, setAiData] = useState<AiContentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 使用 useLockFn 防止重复请求
  const analyzeContent = useLockFn(async (text: string) => {
    setIsLoading(true);
    try {
      setError(null);
      const response = await fetchAiContent(text);
      if (response?.data) {
        setAiData(response.data);
        // 发送成功事件
        if (buttonRef.current) {
          const event = new CustomEvent<AiAnalysisDetail>(AI_ANALYSIS_EVENT, {
            detail: {
              type: 'success',
              data: response.data,
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

      // 检查是否是后端返回的错误信息
      if (err instanceof Error && err.message) {
        // 移除所有版本号前缀，获取实际的错误消息
        const cleanMessage = err.message.replace(/\[v[\d.]+\]\s*/g, '');

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
      // console.error('AI content analysis error:', err);
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
    windowGtag('event', 'login');
    const ret = await getTwitterAuthUrl();
    if (ret?.url) {
      openNewTab(ret.url);
    }
  });

  useEffect(() => {
    setAiData(null);
    setIsLoading(false);
    setError(null);
  }, [tweetId]);

  const clearError = () => {
    setError(null);
  };

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
    if (tweetTextElements.length === 0) return;

    // 提取第一个推文文本内容
    const firstTweetElement = tweetTextElements[0];
    const textContent = firstTweetElement.textContent?.trim();
    if (!textContent) return;

    await analyzeContent(textContent);
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
      // 计算平均概率
      const aiModels = Object.entries(aiData);
      const averageProbability =
        aiModels.length > 0
          ? aiModels.reduce((sum, [_, data]) => {
              const prob = parseFloat(data.ai_probability.replace('%', ''));
              return sum + (isNaN(prob) ? 0 : prob);
            }, 0) / aiModels.length
          : 0;

      return `${t('aiGenerationProbability')} ${averageProbability.toFixed(
        1
      )}%`;
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
        className={`relative flex items-center justify-center px-3 py-1 rounded-full font-medium text-xs transition-all duration-200 cursor-pointer min-h-8 min-w-[60px] text-white mr-3 shadow-sm hover:opacity-90 ${
          aiData || isLoading
            ? 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500'
            : 'bg-gradient-to-r from-sky-600 to-indigo-600'
        } ${
          isLoading ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''
        }`}
        // title={getButtonText()}
        // aria-label={getButtonText()}
      >
        <span className='pointer-events-none absolute inset-0 rounded-full ring-1 ring-white/10'></span>
        {getButtonText()}
        {/* {aiData ? (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-white/80 ring-2 ring-purple-400/40 animate-pulse"></span>
        ) : null} */}
      </button>
    </div>,
    shadowRoot
  );
}

export default React.memo(_TweetDetailButton);
