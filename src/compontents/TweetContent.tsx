import { useMemo, type ReactNode } from 'react';
import { sanitizeHtml } from '~utils/sanitizeHtml';

export type TweetContentPartKind = 'equal' | 'delete' | 'insert';

export interface TweetContentPart {
  kind: TweetContentPartKind;
  text: string;
  collapsed?: boolean;
}

interface TweetContentProps {
  html?: string | null;
  text?: string | null;
  parts?: readonly TweetContentPart[];
  className?: string;
  emptyContent?: ReactNode;
  limitImageWidth?: boolean;
}

const TWEET_ENTITY_PATTERN =
  /(https?:\/\/[^\s]+|@[A-Za-z0-9_]{1,15}|#[\p{L}\p{N}_]+|\$[A-Za-z][A-Za-z0-9_]{0,20})/gu;
const URL_TRAILING_PUNCTUATION = /[.,!?;:，。！？；：)\]}]+$/u;

function getEntityHref(entity: string) {
  if (/^https?:\/\//i.test(entity)) return entity;
  if (entity.startsWith('@')) return `https://x.com/${entity.slice(1)}`;
  if (entity.startsWith('#')) {
    return `https://x.com/hashtag/${encodeURIComponent(entity.slice(1))}`;
  }
  return `https://x.com/search?q=${encodeURIComponent(entity)}&src=cashtag_click`;
}

function renderTextWithEntities(text: string, kind: TweetContentPartKind) {
  const result: ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  for (const match of text.matchAll(TWEET_ENTITY_PATTERN)) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > cursor) {
      result.push(text.slice(cursor, matchIndex));
    }

    const rawEntity = match[0];
    const trailingPunctuation = /^https?:\/\//i.test(rawEntity)
      ? rawEntity.match(URL_TRAILING_PUNCTUATION)?.[0] || ''
      : '';
    const entity = trailingPunctuation
      ? rawEntity.slice(0, -trailingPunctuation.length)
      : rawEntity;

    result.push(
      <a
        key={`tweet-entity-${key}`}
        href={getEntityHref(entity)}
        target='_blank'
        rel='noopener noreferrer nofollow'
        className={`${kind === 'equal' ? 'text-[#1D9BF0]' : 'text-current'} underline decoration-current/50 underline-offset-2 hover:decoration-current`}
        onClick={(event) => event.stopPropagation()}
      >
        {entity}
      </a>,
    );
    if (trailingPunctuation) result.push(trailingPunctuation);

    cursor = matchIndex + rawEntity.length;
    key += 1;
  }

  if (cursor < text.length) result.push(text.slice(cursor));
  return result;
}

function renderPart(part: TweetContentPart, index: number) {
  const content = renderTextWithEntities(part.text, part.kind);
  const key = `tweet-content-part-${part.kind}-${index}`;

  if (part.kind === 'delete') {
    return (
      <del
        key={key}
        className='rounded-sm bg-red-500/10 px-0.5 text-red-600 decoration-red-500 decoration-2 dark:bg-red-400/15 dark:text-red-400 dark:decoration-red-400'
      >
        {content}
      </del>
    );
  }

  if (part.kind === 'insert') {
    return (
      <ins
        key={key}
        className='rounded-sm bg-emerald-500/10 px-0.5 text-emerald-600 no-underline dark:bg-emerald-400/15 dark:text-emerald-400'
      >
        {content}
      </ins>
    );
  }

  return (
    <span key={key} className={part.collapsed ? 'theme-text-secondary' : ''}>
      {content}
    </span>
  );
}

export function TweetContent({
  html,
  text,
  parts,
  className = '',
  emptyContent = null,
  limitImageWidth = false,
}: TweetContentProps) {
  const safeHtml = useMemo(() => sanitizeHtml(html), [html]);
  const hasParts = Boolean(parts?.length);

  return (
    <div
      className={`break-words [&_a]:break-words [&_a]:underline [&_a]:decoration-current/50 [&_a]:underline-offset-2 hover:[&_a]:decoration-current [&_img]:h-auto ${limitImageWidth ? '[&_img]:max-w-[70%]' : '[&_img]:max-w-full'} [&_video]:max-w-full ${className}`}
    >
      {hasParts ? (
        <div className='whitespace-pre-wrap'>
          {parts?.map((part, index) => renderPart(part, index))}
        </div>
      ) : safeHtml ? (
        <div
          className='[&_a]:text-[#1D9BF0] [&_p]:my-0'
          onClick={(event) => {
            if (event.target instanceof Element && event.target.closest('a')) {
              event.stopPropagation();
            }
          }}
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      ) : text ? (
        <div className='whitespace-pre-wrap'>
          {renderTextWithEntities(text, 'equal')}
        </div>
      ) : (
        emptyContent
      )}
    </div>
  );
}
