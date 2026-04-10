import { useEffect, useRef, useState, useCallback, memo } from 'react';
import {
  FloatingContainer,
  FloatingContainerRef,
} from '~/compontents/FloatingContainer';
import { AiContentResponse } from '~types';
import { Sparkles, CircleX } from 'lucide-react';
import { useI18n } from '~contents/hooks/i18n.ts';

// 定义事件类型
export const AI_ANALYSIS_EVENT = 'ai-analysis-event';

export interface AiAnalysisDetail {
  type: 'success' | 'error';
  data?: AiContentResponse;
  error?: string;
  element: HTMLElement;
}

interface AiAnalysisContentProps {
  aiData: AiContentResponse;
  onClose: () => void;
  onMouseLeave?: () => void;
  onMouseEnter?: () => void;
}

// 工具：根据评估等级生成颜色
const getAssessmentColor = (level: string) => {
  // 支持中英文两种格式
  const isHigh = level === '高' || level === 'High';
  const isMedium = level === '中' || level === 'Medium';
  const isLow = level === '低' || level === 'Low';

  if (isHigh) {
    return {
      primary: '#10b981',
      secondary: 'rgba(16, 185, 129, 0.1)',
      bg: 'rgba(16, 185, 129, 0.05)',
    }; // 绿色
  } else if (isMedium) {
    return {
      primary: '#eab308',
      secondary: 'rgba(234, 179, 8, 0.1)',
      bg: 'rgba(234, 179, 8, 0.05)',
    }; // 黄色
  } else if (isLow) {
    return {
      primary: '#ef4444',
      secondary: 'rgba(239, 68, 68, 0.1)',
      bg: 'rgba(239, 68, 68, 0.05)',
    }; // 红色
  } else {
    return {
      primary: '#6b7280',
      secondary: 'rgba(107, 114, 128, 0.1)',
      bg: 'rgba(107, 114, 128, 0.05)',
    }; // 灰色
  }
};

// 工具：根据维度判断颜色（考虑正面/负面）
const getDimensionColor = (dimension: string, level: string) => {
  const baseColor = getAssessmentColor(level);

  // 对于以下维度：低是正面（绿色），高是负面（红色）
  // - promotional_tendency 推广倾向
  // - ai_generation_probability AI 生成概率
  if (
    dimension === 'promotional_tendency' ||
    dimension === 'ai_generation_probability'
  ) {
    const isLow = level === '低' || level === 'Low';
    const isHigh = level === '高' || level === 'High';

    if (isLow) return getAssessmentColor('高'); // 显示为绿色
    if (isHigh) return getAssessmentColor('低'); // 显示为红色
    return baseColor; // 中等为黄色
  }

  // 其他维度：高为绿色，低为红色
  return baseColor;
};

const ModelResultBlock = memo(function ModelResultBlock({
  title,
  analysis,
  t,
  lang,
}: {
  title: string;
  analysis: any;
  t: (k: string) => string;
  lang: string;
}) {
  // Helper function to translate assessment levels
  const translateAssessment = (value: string) => {
    switch (value) {
      case '高':
        return t('assessmentHigh');
      case '中':
        return t('assessmentMedium');
      case '低':
        return t('assessmentLow');
      default:
        return value;
    }
  };

  const dimensions = [
    {
      key: 'information_value',
      label: t('informationValue'),
      value: translateAssessment(analysis.information_value),
    },
    {
      key: 'credibility',
      label: t('credibility'),
      value: translateAssessment(analysis.credibility),
    },
    {
      key: 'promotional_tendency',
      label: t('promotionalTendency'),
      value: translateAssessment(analysis.promotional_tendency),
    },
    {
      key: 'ai_generation_probability',
      label: t('aiGenerationProbability'),
      value: translateAssessment(analysis.ai_generation_probability),
    },
  ];

  return (
    <div
      className='rounded-lg border border-white/10 overflow-hidden'
      style={{ background: 'rgba(255,255,255,0.02)' }}
    >
      {/* 模型标题栏 */}
      <div className='flex items-center justify-between px-3 py-2.5 border-b border-white/10 bg-gradient-to-r from-blue-500/10 to-purple-500/10'>
        <div className='flex items-center gap-2'>
          <div className='flex items-center justify-center w-5 h-5 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10'>
            <div className='w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-400'></div>
          </div>
          <span className='text-xs font-bold theme-text-primary tracking-tight'>
            {title.toUpperCase()} {t('modelAnalysis')}
          </span>
        </div>
      </div>

      {/* 四个维度的评估 */}
      <div className='px-3 py-1'>
        <div className='grid grid-cols-2 gap-1 mb-2'>
          {dimensions.map((dim) => {
            const color = getDimensionColor(dim.key, dim.value);
            return (
              <div
                key={dim.key}
                className='flex items-center justify-between px-2 py-0 rounded-lg border border-white/5'
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                <span className='text-[11px] theme-text-secondary font-medium'>
                  {dim.label}
                </span>
                <span
                  className='text-[10px] px-1 py-1 rounded-full font-bold'
                  style={{
                    // background: color.secondary,
                    color: color.primary,
                    // border: `1px solid ${color.primary}30`,
                  }}
                >
                  {dim.value}
                </span>
              </div>
            );
          })}
        </div>

        {/* 解释文本 */}
        <div
          className='text-[11px] theme-text-primary leading-relaxed rounded-lg border border-white/10 p-1'
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          {(lang === 'zh' ? analysis.explanation_cn : analysis.explanation_en)
            ?.split('\n')
            .map((line: string, index: number) => (
              <div key={index} className='mb-1 last:mb-0'>
                {line}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
});

function AiAnalysisContentInner({
  aiData,
  onClose,
  onMouseLeave,
  onMouseEnter,
}: AiAnalysisContentProps) {
  const { t, lang } = useI18n();
  return (
    <div
      className='w-[380px] rounded-xl overflow-hidden backdrop-blur-xl'
      style={{
        background: 'var(--bg-secondary)',
        //  border: '1px solid rgba(255, 255, 255, 0.1)',
        //  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(255, 255, 255, 0.05)'
      }}
      onMouseLeave={onMouseLeave}
      onMouseEnter={onMouseEnter}
      data-xhunt-exclude={'true'}
    >
      {/* Header - 固定在顶部 */}
      <div className='sticky top-0 z-50 flex items-center justify-between px-4 py-2 border-b border-white/10 overflow-hidden backdrop-blur-xl'>
        {/* 背景装饰 */}
        <div className='absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5'></div>
        <div className='absolute inset-0 bg-gradient-to-br from-transparent via-white/[0.02] to-transparent'></div>

        <div className='flex items-center gap-2'>
          <div className='relative'>
            <Sparkles className='w-4 h-4 text-blue-400 animate-pulse' />
            <div className='absolute inset-0 w-4 h-4 text-blue-400/30 animate-ping'></div>
          </div>
          <h3 className='text-sm font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight'>
            XHunt AI Analysis
          </h3>
        </div>
        <div className='relative z-10'>
          <button
            onClick={onClose}
            className='p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200 group'
          >
            <CircleX className='w-4 h-4 theme-text-secondary group-hover:theme-text-primary transition-colors' />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className='relative max-h-[400px] overflow-y-auto custom-scrollbar'>
        <div className='p-4 space-y-3'>
          {/* 单一模型综合分析结果 */}
          <div className='space-y-3'>
            <ModelResultBlock
              title={'XHUNT'}
              analysis={aiData as any}
              t={t}
              lang={lang}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const AiAnalysisContent = memo(AiAnalysisContentInner);

export function AiAnalysisTips() {
  const { t } = useI18n();
  const [analysisDetail, setAnalysisDetail] = useState<AiAnalysisDetail | null>(
    null
  );
  // const analysisDetailRef = useLatest(analysisDetail);
  const targetRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<FloatingContainerRef>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 清空隐藏定时器的工具函数
  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const handleAnalysisEvent = useCallback(
    (event: CustomEvent<AiAnalysisDetail>) => {
      clearHideTimer();
      const detail = event.detail;
      if (detail && detail.element) {
        targetRef.current = detail.element;
        setAnalysisDetail(detail);
      }
    },
    [clearHideTimer]
  );

  // 监听 analysisDetail 变化，确保状态更新后再显示
  useEffect(() => {
    if (analysisDetail && targetRef.current) {
      clearHideTimer();
      containerRef.current?.show();
    }
  }, [analysisDetail, clearHideTimer]);

  useEffect(() => {
    window.addEventListener(
      AI_ANALYSIS_EVENT,
      handleAnalysisEvent as EventListener
    );
    return () => {
      window.removeEventListener(
        AI_ANALYSIS_EVENT,
        handleAnalysisEvent as EventListener
      );
    };
  }, [handleAnalysisEvent]);

  const handleClose = useCallback(() => {
    clearHideTimer();
    containerRef.current?.hide();
    setAnalysisDetail(null);
  }, [clearHideTimer]);

  const handleMouseEnter = useCallback(() => {
    // 鼠标移入时清空隐藏定时器
    clearHideTimer();
  }, [clearHideTimer]);

  const handleMouseLeave = useCallback(() => {
    // 清空之前的定时器
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    // 延迟500ms隐藏
    hideTimerRef.current = setTimeout(() => {
      containerRef.current?.hide();
      hideTimerRef.current = null;
    }, 500);
  }, []);

  if (!analysisDetail) return null;

  return (
    <FloatingContainer
      ref={containerRef}
      targetRef={targetRef}
      offsetX={-200}
      offsetY={-10}
      maxWidth='380px'
      maxHeight='450px'
      className=''
    >
      {analysisDetail.type === 'success' && analysisDetail.data ? (
        <AiAnalysisContent
          aiData={analysisDetail.data}
          onClose={handleClose}
          onMouseLeave={handleMouseLeave}
          onMouseEnter={handleMouseEnter}
        />
      ) : (
        <div
          className='w-[380px] rounded-xl shadow-2xl overflow-hidden theme-border backdrop-blur-xl'
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
          onMouseLeave={handleMouseLeave}
          onMouseEnter={handleMouseEnter}
          data-xhunt-exclude={'true'}
        >
          {/* Header */}
          <div className='sticky top-0 z-50 flex items-center justify-between px-4 py-2 border-b border-white/10 overflow-hidden backdrop-blur-xl'>
            {/* 背景装饰 */}
            <div className='absolute inset-0 bg-gradient-to-r from-red-500/5 via-orange-500/5 to-yellow-500/5'></div>

            <div className='flex items-center gap-2'>
              <div className='relative'>
                <Sparkles className='w-4 h-4 text-red-400' />
                <div className='absolute inset-0 w-4 h-4 text-red-400/30 animate-pulse'></div>
              </div>
              <h3 className='text-sm font-bold bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent tracking-tight'>
                {t('analysisFailed')}
              </h3>
            </div>
            <div className='relative z-10'>
              <button
                onClick={handleClose}
                className='p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200 group'
              >
                <CircleX className='w-4 h-4 theme-text-secondary group-hover:theme-text-primary transition-colors' />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className='p-4'>
            <div
              className='flex items-center gap-3 p-3 rounded-lg border border-red-500/20 relative overflow-hidden'
              style={{ background: 'rgba(239, 68, 68, 0.05)' }}
            >
              {/* 背景装饰 */}
              <div className='absolute inset-0 bg-gradient-to-br from-red-500/[0.02] via-transparent to-orange-500/[0.02]'></div>

              <div className='relative flex items-center justify-center w-6 h-6 rounded-lg bg-red-500/10 border border-red-500/20'>
                <div className='w-2 h-2 rounded-full bg-red-400'></div>
              </div>
              <p className='relative text-xs theme-text-primary font-medium leading-relaxed'>
                {analysisDetail.error}
              </p>
            </div>
          </div>
        </div>
      )}
    </FloatingContainer>
  );
}
