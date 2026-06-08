import React, { useRef, useMemo } from 'react';
import { Star, ExternalLink } from 'lucide-react';
import { useVirtualList } from 'ahooks';
import { useI18n } from '~contents/hooks/i18n.ts';

export interface GithubRepo {
  rank: number;
  repo_full_name: string;
  repo_url: string;
  description: string;
  language_name: string;
  stars_today: number;
  one_liner?: string;
  one_liner_zh?: string;
}

export interface GithubRepoAnalysis {
  repo_full_name: string;
  one_liner?: string;
  one_liner_zh?: string;
  category?: string;
  category_zh?: string;
  code_quality_score?: number;
  code_quality_grade?: string;
  tags?: string[];
}

interface GithubTrendingListProps {
  repos: GithubRepo[];
  analysesMap?: Record<string, GithubRepoAnalysis>;
  loading?: boolean;
}

const getLocalizedText = (lang: string, zhText?: string, enText?: string) => {
  const zh = zhText?.trim();
  const en = enText?.trim();
  return lang === 'zh' ? zh || en || '' : en || zh || '';
};

export function GithubTrendingList({
  repos,
  analysesMap,
  loading,
}: GithubTrendingListProps) {
  const { t, lang } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const sortedRepos = useMemo(() => {
    return [...repos].sort((a, b) => a.rank - b.rank);
  }, [repos]);

  const [list] = useVirtualList(sortedRepos, {
    containerTarget: containerRef,
    wrapperTarget: wrapperRef,
    itemHeight: (index) => {
      const repo = sortedRepos[index];
      if (!repo) return 0;
      const analysis = analysesMap?.[repo.repo_full_name];
      const oneLiner = getLocalizedText(
        lang,
        analysis?.one_liner_zh || repo.one_liner_zh,
        analysis?.one_liner || repo.one_liner,
      );
      const hasOneLiner = Boolean(oneLiner);
      return hasOneLiner ? 92 : 76;
    },
    overscan: 5,
  });

  if (loading) {
    return (
      <div className='flex items-center justify-center h-full min-h-[360px]'>
        <div className='w-6 h-6 border-2 border-blue-400/20 border-t-blue-400 rounded-full animate-spin'></div>
      </div>
    );
  }

  if (!sortedRepos.length) {
    return (
      <div className='flex items-center justify-center h-full min-h-[360px] theme-text-secondary'>
        <div className='text-center'>
          <div className='text-sm'>{t('noData')}</div>
          <div className='text-xs mt-1'>{t('tryDifferentPeriod')}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className='py-2 h-[360px] overflow-y-auto custom-scrollbar'
    >
      <div ref={wrapperRef} style={{ maxHeight: 'max-content' }}>
        {list.map((ele) => {
          const repo = ele.data;
          const index = ele.index;
          const analysis = analysesMap?.[repo.repo_full_name];
          const oneLiner = getLocalizedText(
            lang,
            analysis?.one_liner_zh || repo.one_liner_zh,
            analysis?.one_liner || repo.one_liner,
          );
          const category = getLocalizedText(
            lang,
            analysis?.category_zh,
            analysis?.category,
          );

          // 排名样式：与 TrendingListVisualization / ModelList 保持一致
          const rankClass =
            index === 0
              ? 'bg-[#e3c102]/90 text-white'
              : index === 1
                ? 'bg-[#C0C0C0]/90 text-white'
                : index === 2
                  ? 'bg-[#CD7F32]/90 text-white'
                  : 'bg-black/5 theme-text-secondary';

          return (
            <div
              key={`${repo.repo_full_name}-${index}`}
              style={{ marginBottom: '8px' }}
              className='relative rounded-lg border theme-border px-3 py-2 hover:bg-white/5 transition-colors cursor-pointer'
            >
              {/* 头部：排名 + 仓库名 + 指标 */}
              <div className='flex items-center gap-2'>
                <span
                  className={`flex items-center justify-center min-w-[20px] px-1.5 h-5 rounded-full text-[11px] font-semibold flex-shrink-0 ${rankClass}`}
                >
                  {repo.rank}
                </span>

                <a
                  href={repo.repo_url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='group flex items-center gap-1 flex-1 min-w-0'
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className='text-sm font-bold theme-text-primary truncate group-hover:underline'>
                    {repo.repo_full_name}
                  </span>
                  <ExternalLink className='w-3 h-3 theme-text-secondary flex-shrink-0 opacity-60' />
                </a>
              </div>

              {/* 摘要：优先 AI 一句话总结，其次原始 description */}
              <p
                className='text-xs theme-text-secondary leading-relaxed line-clamp-2 mt-1.5'
                title={oneLiner || repo.description}
              >
                {oneLiner || repo.description}
              </p>

              {/* 底部标签行 */}
              <div className='flex items-center gap-1.5 mt-2 flex-wrap'>
                {category && (
                  <span className='inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium theme-bg-tertiary/30 theme-text-secondary'>
                    <span className='w-1 h-1 rounded-full bg-blue-400/70' />
                    {category}
                  </span>
                )}
                {repo.language_name && (
                  <span className='inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium theme-bg-tertiary/20 theme-text-secondary'>
                    {/* <span className='w-1 h-1 rounded-full theme-text-secondary' /> */}
                    {repo.language_name}
                  </span>
                )}
                {repo.stars_today > 0 && (
                  <span className='inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium theme-bg-tertiary/30 theme-text-secondary'>
                    <Star className='w-2.5 h-2.5 theme-text-secondary' />+
                    {repo.stars_today.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
