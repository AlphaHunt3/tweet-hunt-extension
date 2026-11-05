import type { EditedTweetChain, EditedTweetVersion } from '~types';

export type EditedTweetDiffKind = 'equal' | 'delete' | 'insert';

export interface EditedTweetDiffPart {
  kind: EditedTweetDiffKind;
  text: string;
  collapsed?: boolean;
}

export interface EditedTweetTransition {
  key: string;
  beforeId: string;
  afterId: string;
  before?: EditedTweetVersion;
  after?: EditedTweetVersion;
  status: 'available' | 'pending';
}

const MAX_DIFF_TOKENS = 500;
const CONTEXT_TOKENS = 6;

function normalizeText(value: string) {
  return String(value || '').replace(/\r\n?/g, '\n');
}

function resolveSegmenterLocale(lang: string) {
  const candidate = String(lang || '').trim();
  if (!candidate) return undefined;

  try {
    return Intl.getCanonicalLocales(candidate)[0];
  } catch {
    return undefined;
  }
}

function fallbackTokenizeEditedTweetText(text: string) {
  if (/\p{Script=Han}/u.test(text)) {
    return Array.from(text);
  }

  return text.match(/\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu) || [];
}

export function tokenizeEditedTweetText(text: string, lang = 'en') {
  const normalized = normalizeText(text);
  const Segmenter = (
    Intl as typeof Intl & {
      Segmenter?: new (
        locale?: string,
        options?: { granularity: 'word' },
      ) => { segment: (value: string) => Iterable<{ segment: string }> };
    }
  ).Segmenter;

  if (Segmenter) {
    try {
      const segmenter = new Segmenter(resolveSegmenterLocale(lang), {
        granularity: 'word',
      });
      return Array.from(segmenter.segment(normalized), (item) => item.segment);
    } catch {
      return fallbackTokenizeEditedTweetText(normalized);
    }
  }

  return fallbackTokenizeEditedTweetText(normalized);
}

function mergeParts(parts: EditedTweetDiffPart[]) {
  return parts.reduce<EditedTweetDiffPart[]>((result, part) => {
    const previous = result[result.length - 1];
    if (
      previous?.kind === part.kind &&
      !previous.collapsed &&
      !part.collapsed
    ) {
      previous.text += part.text;
    } else {
      result.push({ ...part });
    }
    return result;
  }, []);
}

function diffTokenSequences(before: string[], after: string[]) {
  const rows = before.length + 1;
  const columns = after.length + 1;
  const matrix = Array.from({ length: rows }, () => new Uint16Array(columns));

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < columns; j += 1) {
      matrix[i][j] =
        before[i - 1] === after[j - 1]
          ? matrix[i - 1][j - 1] + 1
          : Math.max(matrix[i - 1][j], matrix[i][j - 1]);
    }
  }

  const reversed: EditedTweetDiffPart[] = [];
  let i = before.length;
  let j = after.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && before[i - 1] === after[j - 1]) {
      reversed.push({ kind: 'equal', text: before[i - 1] });
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || matrix[i][j - 1] >= matrix[i - 1][j])) {
      reversed.push({ kind: 'insert', text: after[j - 1] });
      j -= 1;
    } else {
      reversed.push({ kind: 'delete', text: before[i - 1] });
      i -= 1;
    }
  }

  return reversed.reverse();
}

export function diffEditedTweetText(
  beforeText: string,
  afterText: string,
  lang = 'en',
) {
  try {
    const before = tokenizeEditedTweetText(beforeText, lang);
    const after = tokenizeEditedTweetText(afterText, lang);
    let prefixLength = 0;
    while (
      prefixLength < before.length &&
      prefixLength < after.length &&
      before[prefixLength] === after[prefixLength]
    ) {
      prefixLength += 1;
    }

    let suffixLength = 0;
    while (
      suffixLength < before.length - prefixLength &&
      suffixLength < after.length - prefixLength &&
      before[before.length - suffixLength - 1] ===
        after[after.length - suffixLength - 1]
    ) {
      suffixLength += 1;
    }

    const beforeMiddle = before.slice(
      prefixLength,
      before.length - suffixLength,
    );
    const afterMiddle = after.slice(prefixLength, after.length - suffixLength);
    const middleParts: EditedTweetDiffPart[] =
      beforeMiddle.length + afterMiddle.length > MAX_DIFF_TOKENS
        ? [
            ...(beforeMiddle.length
              ? [{ kind: 'delete' as const, text: beforeMiddle.join('') }]
              : []),
            ...(afterMiddle.length
              ? [{ kind: 'insert' as const, text: afterMiddle.join('') }]
              : []),
          ]
        : diffTokenSequences(beforeMiddle, afterMiddle);

    return mergeParts([
      ...(prefixLength
        ? [
            {
              kind: 'equal' as const,
              text: before.slice(0, prefixLength).join(''),
            },
          ]
        : []),
      ...middleParts,
      ...(suffixLength
        ? [
            {
              kind: 'equal' as const,
              text: before.slice(before.length - suffixLength).join(''),
            },
          ]
        : []),
    ]);
  } catch {
    const before = normalizeText(beforeText);
    const after = normalizeText(afterText);
    if (before === after) {
      return before ? [{ kind: 'equal' as const, text: before }] : [];
    }

    return [
      ...(before ? [{ kind: 'delete' as const, text: before }] : []),
      ...(after ? [{ kind: 'insert' as const, text: after }] : []),
    ];
  }
}

export function collapseEditedTweetDiff(
  parts: EditedTweetDiffPart[],
  lang = 'en',
) {
  const result: EditedTweetDiffPart[] = [];
  parts.forEach((part, index) => {
    if (part.kind !== 'equal') {
      if (part.text.length > 600) {
        result.push({ ...part, text: part.text.slice(0, 300) });
        result.push({ ...part, text: '…', collapsed: true });
        result.push({ ...part, text: part.text.slice(-200) });
        return;
      }

      result.push(part);
      return;
    }

    const tokens = tokenizeEditedTweetText(part.text, lang);
    if (tokens.length <= CONTEXT_TOKENS * 2) {
      result.push(part);
      return;
    }

    if (index === 0) {
      result.push({ kind: 'equal', text: '…', collapsed: true });
      result.push({
        kind: 'equal',
        text: tokens.slice(-CONTEXT_TOKENS).join(''),
      });
      return;
    }

    if (index === parts.length - 1) {
      result.push({
        kind: 'equal',
        text: tokens.slice(0, CONTEXT_TOKENS).join(''),
      });
      result.push({ kind: 'equal', text: '…', collapsed: true });
      return;
    }

    result.push({
      kind: 'equal',
      text: tokens.slice(0, CONTEXT_TOKENS).join(''),
    });
    result.push({ kind: 'equal', text: '…', collapsed: true });
    result.push({
      kind: 'equal',
      text: tokens.slice(-CONTEXT_TOKENS).join(''),
    });
  });
  return result;
}

export function buildEditedTweetTransitions(
  chain: EditedTweetChain,
): EditedTweetTransition[] {
  const versionList = Array.isArray(chain.versions) ? chain.versions : [];
  const versions = new Map(versionList.map((version) => [version.id, version]));
  const versionIds = Array.isArray(chain.edit?.version_ids)
    ? chain.edit.version_ids
    : [];
  const orderedIds = Array.from(new Set(versionIds));

  return orderedIds.slice(1).map((afterId, index) => {
    const beforeId = orderedIds[index];
    const before = versions.get(beforeId);
    const after = versions.get(afterId);
    const isAvailable =
      before?.status === 'available' &&
      after?.status === 'available' &&
      Boolean(before.tweet) &&
      Boolean(after.tweet);

    return {
      key: `${chain.edit.root_id}:${beforeId}:${afterId}`,
      beforeId,
      afterId,
      before,
      after,
      status: isAvailable ? 'available' : 'pending',
    };
  });
}
