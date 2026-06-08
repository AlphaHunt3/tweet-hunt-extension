import React from 'react';
import { MessageSquare, Eye, ExternalLink } from 'lucide-react';
import { useI18n } from '~contents/hooks/i18n.ts';
import { getModelMeta } from './modelMeta';

export interface ModelHit {
  family: string;
  provider_hint: string;
  variant: string | null;
}

export interface TweetModelItem {
  links: string[];
  model: string;
  summary_cn: string;
  summary_en: string;
  tweets_count: number;
  views: number;
  // 新接口新增字段
  rank?: number;
  score?: number;
  share?: number;
  model_hit?: ModelHit;
  kol_engage_count?: number;
  kol_engage_score?: number;
  tweets_count_score?: number;
  view_score?: number;
}

interface ModelListProps {
  items: TweetModelItem[];
}

function formatViews(num: number): string {
  if (num >= 100000000) return (num / 100000000).toFixed(1) + '亿';
  if (num >= 10000) return (num / 10000).toFixed(1) + '万';
  return num.toLocaleString();
}

export const ModelList: React.FC<ModelListProps> = ({ items }) => {
  const { lang } = useI18n();

  if (!items.length) return null;

  return (
    <div className='flex flex-col gap-2.5 py-1'>
      {items.map((item, index) => {
        const meta = getModelMeta(item.model);
        const summary = lang === 'zh' ? item.summary_cn : item.summary_en;

        // 排名序号样式：与 TweetList 保持一致
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
            key={item.model + index}
            className='relative rounded-lg border theme-border px-3 py-2 hover:bg-white/5 transition-colors'
          >
            {/* 头部：排名 + 模型名 + 指标 */}
            <div className='flex items-center gap-2 mb-2'>
              <span
                className={`flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold flex-shrink-0 ${rankClass}`}
              >
                {index + 1}
              </span>
              <span className='text-sm font-bold flex-1 theme-text-primary'>
                {meta.name}
              </span>
              <div className='flex items-center gap-2.5'>
                <span className='flex items-center gap-0.5 text-[11px] theme-text-secondary'>
                  <MessageSquare className='w-3 h-3' />
                  {item.tweets_count}
                </span>
                <span className='flex items-center gap-0.5 text-[11px] theme-text-secondary'>
                  <Eye className='w-3 h-3' />
                  {formatViews(item.views)}
                </span>
              </div>
            </div>

            {/* 摘要 */}
            <p className='text-xs theme-text-secondary leading-relaxed line-clamp-3'>
              {summary}
            </p>

            {/* 相关链接 */}
            {item.links && item.links.length > 0 && (
              <div className='flex flex-wrap gap-1.5 mt-2'>
                {item.links.slice(0, 3).map((link, i) => {
                  let hostname = link;
                  try { hostname = new URL(link).hostname.replace('www.', ''); } catch { /* keep raw */ }
                  return (
                    <a
                      key={i}
                      href={link}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md transition-colors hover:opacity-80 theme-bg-tertiary/30 theme-text-secondary'
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className='w-2.5 h-2.5' />
                      {hostname}
                    </a>
                  );
                })}
                {item.links.length > 3 && (
                  <span className='text-[10px] theme-text-tertiary px-1'>
                    +{item.links.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ModelList;
