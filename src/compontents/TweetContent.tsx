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

function renderTextWithEntities(text: string) {
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
  const content = renderTextWithEntities(part.text);
  const key = `tweet-content-part-${part.kind}-${index}`;
  if (part.kind === 'delete') {
    return (
      <del key={key} className='xh-diff-del'>
        {content}
      </del>
    );
  }
  if (part.kind === 'insert') {
    return (
      <ins key={key} className='xh-diff-ins'>
        {content}
      </ins>
    );
  }
  return (
    <span key={key} className={part.collapsed ? 'xh-tweet-collapsed' : undefined}>
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
    <div className={`xh-tweet-content ${className}`} data-limit-images={limitImageWidth ? '' : undefined}>
      {hasParts ? (
        <div className='xh-tweet-pre'>{parts?.map((part, index) => renderPart(part, index))}</div>
      ) : safeHtml ? (
        <div
          onClick={(event) => {
            if (event.target instanceof Element && event.target.closest('a')) {
              event.stopPropagation();
            }
          }}
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      ) : text ? (
        <div className='xh-tweet-pre'>{renderTextWithEntities(text)}</div>
      ) : (
        emptyContent
      )}
    </div>
  );
}
