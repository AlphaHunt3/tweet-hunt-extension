import { useEffect, useRef, useState, useCallback, memo } from 'react';
import {
  FloatingContainer,
  FloatingContainerRef,
} from '~/compontents/FloatingContainer';
import { AiDetectResponse } from '~types';
import { Sparkles, CircleX, AlertTriangle, CheckCircle, Info, Shield, Lightbulb, FileText, Star } from 'lucide-react';
import { useI18n } from '~contents/hooks/i18n.ts';

export const AI_DETECT_EVENT = 'ai-detect-event';

export interface AiDetectDetail {
  type: 'success' | 'error' | 'reset';
  data?: AiDetectResponse;
  error?: string;
  element?: HTMLElement;
  quota?: { total: number; used: number; remaining: number };
  componentType?: 'compose' | 'inlineReply' | 'homeTimeline';
}

interface AiDetectContentProps {
  aiData: AiDetectResponse;
  quota?: { total: number; used: number; remaining: number };
  onClose: () => void;
}

const RISK_CONFIG = {
  high: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.15)', icon: AlertTriangle },
  medium: { color: '#eab308', bg: 'rgba(234, 179, 8, 0.08)', border: 'rgba(234, 179, 8, 0.15)', icon: Info },
  low: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.15)', icon: CheckCircle },
};

const getRiskConfig = (level: string) => {
  if (level === '高' || level === 'High') return RISK_CONFIG.high;
  if (level === '中' || level === 'Medium') return RISK_CONFIG.medium;
  return RISK_CONFIG.low;
};

const getProbColor = (prob: number) => prob <= 0.3 ? '#10b981' : prob <= 0.7 ? '#eab308' : '#ef4444';

// 紧凑的风险分数徽章
const RiskBadge = ({ score, level, isEn }: { score: number; level: string; isEn: boolean }) => {
  const cfg = getRiskConfig(level);
  const label = isEn ? `Risk ${level}` : `风险${level}`;
  return (
    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ml-auto"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      <cfg.icon className="w-3 h-3" />
      {score}% {label}
    </div>
  );
};

// 紧凑的概率条
const ProbBar = ({ value }: { value: number }) => {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(128, 128, 128, 0.25)' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: getProbColor(value) }} />
      </div>
      <span className="text-[11px] font-bold w-8 text-right" style={{ color: getProbColor(value) }}>{pct}%</span>
    </div>
  );
};

// 卡片头部
const CardHeader = ({ icon: Icon, title, badge, right }: {
  icon: any; title: string; badge?: React.ReactNode; right?: React.ReactNode;
}) => (
  <div className="flex items-center justify-between px-2 py-1.5 border-b border-white/5">
    <div className="flex items-center gap-1.5">
      <div className="flex items-center justify-center w-4 h-4 rounded bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10">
        <Icon className="w-2 h-2 text-blue-400" />
      </div>
      <span className="text-xs font-bold theme-text-primary">{title}</span>
      {badge}
    </div>
    {right}
  </div>
);

// 限流风险卡片
const ShadowbanCard = memo(function ShadowbanCard({ data, lang }: { data: AiDetectResponse['shadowban_risk']; lang: string }) {
  const { t } = useI18n();
  const isEn = lang === 'en';
  const level = isEn ? data.level_en : data.level_cn;
  const cfg = getRiskConfig(level);
  const issues = isEn ? data.issues_en : data.issues_cn;
  const hasIssues = issues?.length > 0 && !issues[0].match(/无|No/i);

  return (
    <div className="rounded-lg border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <CardHeader
        icon={Shield}
        title={t('shadowbanRisk')}
        right={<RiskBadge score={data.score} level={level} isEn={isEn} />}
      />
      <div className="px-2 py-1.5 space-y-1.5">
        {hasIssues ? (
          <div className="space-y-0.5">
            {issues.map((issue, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="w-1 h-1 rounded-full mt-1 shrink-0" style={{ background: cfg.color }} />
                <span className="text-[11px] theme-text-secondary leading-relaxed">{issue}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] theme-text-secondary">
            <CheckCircle className="w-3 h-3 text-green-400" />
            {t('noSignificantRisks')}
          </div>
        )}
        <div className="flex items-start gap-1.5 p-0.5 rounded" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <cfg.icon className="w-3 h-3 mt-0.5 shrink-0" style={{ color: cfg.color }} />
          <div className="text-[11px] leading-relaxed">
            <span className="theme-text-secondary">{t('shadowbanAdvice')}: </span>
            <span className="theme-text-primary">{isEn ? data.advice_en : data.advice_cn}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

// 合规检测卡片
const ComplianceCard = memo(function ComplianceCard({ data, lang }: { data: AiDetectResponse['compliance']; lang: string }) {
  const { t } = useI18n();
  const isEn = lang === 'en';

  const Item = ({ label, prob, reason }: { label: string; prob: number; reason: string }) => (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] theme-text-secondary">{label}
          <p className="text-[10px] theme-text-secondary leading-relaxed inline-block">({reason})</p>
        </span>
      </div>
      <ProbBar value={prob} />
    </div>
  );

  return (
    <div className="rounded-lg border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <CardHeader
        icon={FileText}
        title={t('complianceCheck')}
      // right={<span className="text-[10px] theme-text-secondary">{t('lowerIsBetter')}</span>}
      />
      <div className="px-2 py-1.5 space-y-2">
        <Item label={t('commercialIntent')} prob={data.commercial_prob}
          reason={isEn ? data.commercial_reason_en : data.commercial_reason_cn} />
        <div className="h-px bg-white/5" />
        <Item label={t('aiGenerated')} prob={data.ai_prob}
          reason={isEn ? data.ai_reason_en : data.ai_reason_cn} />
      </div>
    </div>
  );
});

// 内容质量分数徽章（风格与 RiskBadge 保持一致）
const QualityScoreBadge = ({ score, isEn }: { score: number; isEn: boolean }) => {
  const getScoreConfig = (s: number) => {
    if (s >= 80) return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.15)', icon: Star };
    if (s >= 60) return { color: '#eab308', bg: 'rgba(234, 179, 8, 0.08)', border: 'rgba(234, 179, 8, 0.15)', icon: Star };
    return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.15)', icon: Star };
  };
  const cfg = getScoreConfig(score);
  const Icon = cfg.icon;
  const label = isEn ? 'Quality:' : '质量分:';
  return (
    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ml-auto"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      <Icon className="w-3 h-3" />
      {label} {score}
    </div>
  );
};

// 内容建议卡片
const AdviceCard = memo(function AdviceCard({ data, lang }: { data: AiDetectResponse['content_advice']; lang: string }) {
  const { t } = useI18n();
  const isEn = lang === 'en';
  const items = [
    { label: t('contentAdviceHook'), val: isEn ? data.hook_en : data.hook_cn },
    { label: t('contentAdviceBody'), val: isEn ? data.body_en : data.body_cn },
    { label: t('contentAdviceErrors'), val: isEn ? data.error_check_en : data.error_check_cn },
  ];

  return (
    <div className="rounded-lg border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <CardHeader
        icon={Lightbulb}
        title={t('contentAdvice')}
        right={data.content_quality_score !== undefined ? (
          <QualityScoreBadge score={data.content_quality_score} isEn={isEn} />
        ) : undefined}
      />
      <div className="px-2 py-1.5 space-y-1">
        {items.map((item) => (
          <div key={item.label} className="flex items-start gap-2 px-1.5 py-0.5 rounded border border-white/5" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <span className="text-[11px] theme-text-primary shrink-0 w-8">{item.label}</span>
            <span className="text-[11px] theme-text-secondary leading-snug flex-1">{item.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

function AiDetectContent({ aiData, quota, onClose }: AiDetectContentProps) {
  const { t, lang } = useI18n();
  const quotaText = quota ? t('aiDetectQuotaText').replace('{remaining}', String(quota.remaining)).replace('{total}', String(quota.total)) : '';

  return (
    <div className="w-[340px] rounded-xl overflow-hidden backdrop-blur-xl flex flex-col"
      style={{ background: 'var(--bg-secondary)', maxHeight: '460px', height: 460 }}
      data-xhunt-exclude="true">

      {/* Header - 固定 */}
      <div className="flex-shrink-0 flex items-center justify-between px-2.5 py-1.5 border-b border-white/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5" />
        <div className="flex items-center gap-1.5 relative z-10">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <h3 className="text-xs font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            {t('aiDetectTitle')}
          </h3>
        </div>
        <button onClick={onClose} className="relative z-10 p-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 transition-all">
          <CircleX className="w-3.5 h-3.5 theme-text-secondary" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
        <ShadowbanCard data={aiData.shadowban_risk} lang={lang} />
        <ComplianceCard data={aiData.compliance} lang={lang} />
        <AdviceCard data={aiData.content_advice} lang={lang} />
      </div>

      {/* Footer - 固定，配额和免责声明合并 */}
      <div className="flex-shrink-0 px-2.5 py-2 border-t border-white/10 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
        {quota && (
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: quota.remaining > 0 ? '#10b981' : '#ef4444' }} />
            <span className="text-[10px] theme-text-secondary">{quotaText}</span>
          </div>
        )}
        <p className="text-[9px] theme-text-secondary text-center opacity-50">
          {t('aiAnalysisDisclaimer')}
        </p>
      </div>
    </div>
  );
}

// 分别为 compose 和 inlineReply 维护独立的状态
interface AiDetectState {
  detail: AiDetectDetail | null;
  targetRef: React.MutableRefObject<HTMLElement | null>;
  containerRef: React.MutableRefObject<FloatingContainerRef | null>;
}

export function AiDetectTips() {
  const { t, lang } = useI18n();

  // 使用 ref 来存储三个组件的状态，避免重渲染问题
  const composeStateRef = useRef<AiDetectState>({
    detail: null,
    targetRef: { current: null },
    containerRef: { current: null },
  });

  const inlineReplyStateRef = useRef<AiDetectState>({
    detail: null,
    targetRef: { current: null },
    containerRef: { current: null },
  });

  const homeTimelineStateRef = useRef<AiDetectState>({
    detail: null,
    targetRef: { current: null },
    containerRef: { current: null },
  });

  const [, forceUpdate] = useState({});

  const handleEvent = useCallback((e: CustomEvent<AiDetectDetail>) => {
    const componentType = e.detail?.componentType || 'compose';
    const stateRef =
      componentType === 'inlineReply'
        ? inlineReplyStateRef
        : componentType === 'homeTimeline'
        ? homeTimelineStateRef
        : composeStateRef;

    if (e.detail?.type === 'reset') {
      // 只关闭对应组件的面板
      stateRef.current.containerRef.current?.hide();
      stateRef.current.detail = null;
      forceUpdate({});
      return;
    }

    if (e.detail?.element) {
      stateRef.current.targetRef.current = e.detail.element;
      stateRef.current.detail = e.detail;
      forceUpdate({});
      // 使用 setTimeout 确保 ref 已更新后再显示
      setTimeout(() => {
        stateRef.current.containerRef.current?.show();
      }, 0);
    }
  }, []);

  useEffect(() => {
    window.addEventListener(AI_DETECT_EVENT, handleEvent as EventListener);
    return () => window.removeEventListener(AI_DETECT_EVENT, handleEvent as EventListener);
  }, [handleEvent]);

  const createCloseHandler = (componentType: 'compose' | 'inlineReply' | 'homeTimeline') => () => {
    const stateRef =
      componentType === 'inlineReply'
        ? inlineReplyStateRef
        : componentType === 'homeTimeline'
        ? homeTimelineStateRef
        : composeStateRef;
    stateRef.current.containerRef.current?.hide();
    stateRef.current.detail = null;
    forceUpdate({});
  };

  // 根据组件类型返回对应的偏移量
  const getOffset = (componentType?: 'compose' | 'inlineReply' | 'homeTimeline') => {
    if (componentType === 'inlineReply') {
      return { offsetX: -100, offsetY: -200 }; // 内联回复按钮在上方显示
    }
    if (componentType === 'homeTimeline') {
      return { offsetX: -170, offsetY: -10 }; // Home Timeline 按钮在下方显示
    }
    return { offsetX: -170, offsetY: -10 }; // Compose Modal 按钮在下方显示
  };

  const renderContainer = (componentType: 'compose' | 'inlineReply' | 'homeTimeline') => {
    const stateRef =
      componentType === 'inlineReply'
        ? inlineReplyStateRef
        : componentType === 'homeTimeline'
        ? homeTimelineStateRef
        : composeStateRef;
    const detail = stateRef.current.detail;

    if (!detail) return null;

    const { offsetX, offsetY } = getOffset(componentType);
    const close = createCloseHandler(componentType);

    return (
      <FloatingContainer
        key={componentType}
        ref={stateRef.current.containerRef}
        targetRef={stateRef.current.targetRef}
        offsetX={offsetX}
        offsetY={offsetY}
        maxWidth="360px"
        maxHeight="460px"
      // pinned={true}
      >
        {detail.type === 'success' && detail.data ? (
          <AiDetectContent aiData={detail.data} quota={detail.quota} onClose={close} />
        ) : (
          <div className="w-[340px] rounded-xl overflow-hidden backdrop-blur-xl" style={{ background: 'var(--bg-secondary)' }}>
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/10 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-orange-500/5 to-yellow-500/5" />
              <div className="flex items-center gap-1.5 relative z-10">
                <Sparkles className="w-3.5 h-3.5 text-red-400" />
                <h3 className="text-xs font-bold bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
                  {t('detectFailed')}
                </h3>
              </div>
              <button onClick={close} className="relative z-10 p-1 rounded bg-white/5 hover:bg-white/10 border border-white/10">
                <CircleX className="w-3.5 h-3.5 theme-text-secondary" />
              </button>
            </div>
            <div className="p-2">
              <div className="flex items-center gap-2 p-2 rounded-lg border border-red-500/20" style={{ background: 'rgba(239, 68, 68, 0.05)' }}>
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-xs theme-text-primary">{detail.error}</p>
              </div>
            </div>
          </div>
        )}
      </FloatingContainer>
    );
  };

  return (
    <>
      {renderContainer('compose')}
      {renderContainer('inlineReply')}
      {renderContainer('homeTimeline')}
    </>
  );
}
