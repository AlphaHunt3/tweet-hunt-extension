import { useEffect, useRef, useState, useCallback, memo } from 'react';
import { FloatingContainer, FloatingContainerRef } from '~/compontents/FloatingContainer';
import { AiContentData } from '~types';
import { Sparkles, CircleX } from 'lucide-react';
import { useI18n } from '~contents/hooks/i18n.ts';

// 定义事件类型
export const AI_ANALYSIS_EVENT = 'ai-analysis-event';

export interface AiAnalysisDetail {
  type: 'success' | 'error';
  data?: AiContentData;
  error?: string;
  element: HTMLElement;
}

interface AiAnalysisContentProps {
  aiData: AiContentData;
  onClose: () => void;
  onMouseLeave?: () => void;
  onMouseEnter?: () => void;
}

// 工具：根据概率生成颜色（提升到组件外避免重复创建）
const getProbabilityColor = (probability: number) => {
  if (probability >= 80) return { primary: '#ef4444', secondary: 'rgba(239, 68, 68, 0.1)', bg: 'rgba(239, 68, 68, 0.05)' };
  if (probability >= 60) return { primary: '#f97316', secondary: 'rgba(249, 115, 22, 0.1)', bg: 'rgba(249, 115, 22, 0.05)' };
  if (probability >= 40) return { primary: '#eab308', secondary: 'rgba(234, 179, 8, 0.1)', bg: 'rgba(234, 179, 8, 0.05)' };
  if (probability >= 20) return { primary: '#06b6d4', secondary: 'rgba(6, 182, 212, 0.1)', bg: 'rgba(6, 182, 212, 0.05)' };
  return { primary: '#10b981', secondary: 'rgba(16, 185, 129, 0.1)', bg: 'rgba(16, 185, 129, 0.05)' };
};

const ModelResultBlock = memo(function ModelResultBlock({ title, prob, reason, t }: { title: string; prob: string; reason: string; t: (k: string) => string }) {
  const color = getProbabilityColor(parseFloat((prob || '0').replace('%','')));
  return (
    <div className="rounded-lg border border-white/10" style={{ background: '#a7a7a71f' }}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-400"></div>
          </div>
          <span className="text-xs font-semibold theme-text-primary tracking-tight">{title} {t('model')}</span>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: color.secondary, color: color.primary, border: `1px solid ${color.primary}30` }}>{prob || '0%'}</span>
      </div>
      <div className="px-3 py-0">
        <div className="text-[11px] theme-text-primary leading-relaxed rounded-md border border-white/10" style={{ background: 'rgba(255,255,255,0.02)' }}>
          {reason}
        </div>
      </div>
    </div>
  );
});

function AiAnalysisContentInner({ aiData, onClose, onMouseLeave, onMouseEnter }: AiAnalysisContentProps) {
  const { t } = useI18n();
  
  // 计算平均概率
  const aiModels = Object.entries(aiData);
  const averageProbability = aiModels.length > 0
    ? aiModels.reduce((sum, [_, data]) => {
        const prob = parseFloat(data.ai_probability.replace('%', ''));
        return sum + (isNaN(prob) ? 0 : prob);
      }, 0) / aiModels.length
    : 0;

  const probabilityColors = getProbabilityColor(averageProbability);
  const renderModel = useCallback(([name, d]: [string, any]) => (
    <ModelResultBlock
      key={name}
      title={name.toUpperCase()}
      prob={d.ai_probability}
      reason={d.reason_zh || d.reason_en}
      t={t}
    />
  ), [t]);
  return (
    <div className="w-[380px] rounded-xl overflow-hidden backdrop-blur-xl" 
         style={{
           background: 'var(--bg-secondary)',
          //  border: '1px solid rgba(255, 255, 255, 0.1)',
          //  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(255, 255, 255, 0.05)'
         }}
         onMouseLeave={onMouseLeave}
         onMouseEnter={onMouseEnter}
         data-xhunt-exclude={'true'}>
      {/* Header - 固定在顶部 */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-4 py-2 border-b border-white/10 overflow-hidden backdrop-blur-xl">
        {/* 背景装饰 */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/[0.02] to-transparent"></div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
            <div className="absolute inset-0 w-4 h-4 text-blue-400/30 animate-ping"></div>
          </div>
          <h3 className="text-sm font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight">
            XHunt AI Analysis
          </h3>
        </div>
        <div className="relative z-10">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200 group"
          >
            <CircleX className="w-4 h-4 theme-text-secondary group-hover:theme-text-primary transition-colors" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="relative max-h-[400px] overflow-y-auto custom-scrollbar">
        <div className="p-4 space-y-3">
          {/* 平均概率概览（简洁精致，无进度条） */}
          <div className="relative p-2.5 rounded-lg border overflow-hidden"
               style={{
                 background: `linear-gradient(135deg, ${probabilityColors.bg}, ${probabilityColors.secondary})`,
                 borderColor: probabilityColors.secondary
               }}>
            <div className="relative flex items-center gap-2.5">
              <span
                className="px-2 py-0.5 text-xs font-bold rounded-full"
                style={{
                  color: probabilityColors.primary,
                  background: 'rgba(255,255,255,0.06)',
                  border: `1px solid ${probabilityColors.primary}30`
                }}
              >
                {averageProbability.toFixed(1)}%
              </span>
              <span className="text-[11px] font-medium theme-text-primary opacity-80">
                {t('aiGenerationProbability')}
              </span>
            </div>
          </div>
 
          {/* 模型分析结果（统一逻辑渲染） */}
          <div className="space-y-2">
            {aiModels.map(renderModel)}
          </div>
        </div>
      </div>
    </div>
  );
}

const AiAnalysisContent = memo(AiAnalysisContentInner);

export function AiAnalysisTips() {
  const { t } = useI18n();
  const [analysisDetail, setAnalysisDetail] = useState<AiAnalysisDetail | null>(null);
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

  const handleAnalysisEvent = useCallback((event: CustomEvent<AiAnalysisDetail>) => {
    clearHideTimer();
    const detail = event.detail;
    if (detail && detail.element) {
      targetRef.current = detail.element;
      setAnalysisDetail(detail);
    }
  }, [clearHideTimer]);

  // 监听 analysisDetail 变化，确保状态更新后再显示
  useEffect(() => {
    if (analysisDetail && targetRef.current) {
      clearHideTimer();
      containerRef.current?.show();
    }
  }, [analysisDetail, clearHideTimer]);

  useEffect(() => {
    window.addEventListener(AI_ANALYSIS_EVENT, handleAnalysisEvent as EventListener);
    return () => {
      window.removeEventListener(AI_ANALYSIS_EVENT, handleAnalysisEvent as EventListener);
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
      maxWidth="380px"
      maxHeight="450px"
      className=""
    >
      {analysisDetail.type === 'success' && analysisDetail.data ? (
        <AiAnalysisContent aiData={analysisDetail.data} onClose={handleClose} onMouseLeave={handleMouseLeave} onMouseEnter={handleMouseEnter} />
      ) : (
        <div className="w-[380px] rounded-xl shadow-2xl overflow-hidden theme-border backdrop-blur-xl" 
             style={{
               background: 'var(--bg-secondary)',
               border: '1px solid rgba(255, 255, 255, 0.1)'
             }}
             onMouseLeave={handleMouseLeave}
             onMouseEnter={handleMouseEnter}
             data-xhunt-exclude={'true'}>
          {/* Header */}
          <div className="sticky top-0 z-50 flex items-center justify-between px-4 py-2 border-b border-white/10 overflow-hidden backdrop-blur-xl">
            {/* 背景装饰 */}
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-orange-500/5 to-yellow-500/5"></div>
            
            <div className="flex items-center gap-2">
              <div className="relative">
                <Sparkles className="w-4 h-4 text-red-400" />
                <div className="absolute inset-0 w-4 h-4 text-red-400/30 animate-pulse"></div>
              </div>
              <h3 className="text-sm font-bold bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent tracking-tight">
                {t('analysisFailed')}
              </h3>
            </div>
            <div className="relative z-10">
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200 group"
              >
                <CircleX className="w-4 h-4 theme-text-secondary group-hover:theme-text-primary transition-colors" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <div className="flex items-center gap-3 p-3 rounded-lg border border-red-500/20 relative overflow-hidden"
                 style={{ background: 'rgba(239, 68, 68, 0.05)' }}>
              {/* 背景装饰 */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/[0.02] via-transparent to-orange-500/[0.02]"></div>
              
              <div className="relative flex items-center justify-center w-6 h-6 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="w-2 h-2 rounded-full bg-red-400"></div>
              </div>
              <p className="relative text-xs theme-text-primary font-medium leading-relaxed">
                {analysisDetail.error}
              </p>
            </div>
          </div>
        </div>
      )}
    </FloatingContainer>
  );
}
