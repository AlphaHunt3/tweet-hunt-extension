export type TextDiffKind = 'equal' | 'delete' | 'insert';

export interface TextDiffPart {
  kind: TextDiffKind;
  text: string;
  collapsed?: boolean;
}

const MAX_DIFF_TOKENS = 500;

function normalizeText(value: string) {
  return value.replace(/\r\n?/g, '\n');
}

function resolveSegmenterLocale(lang: string) {
  const candidate = lang.trim();
  if (!candidate) return undefined;

  try {
    return Intl.getCanonicalLocales(candidate)[0];
  } catch {
    return undefined;
  }
}

function fallbackTokenize(text: string) {
  if (/\p{Script=Han}/u.test(text)) return Array.from(text);
  return text.match(/\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu) || [];
}

export function tokenizeText(text: string, lang = 'en') {
  const normalized = normalizeText(text);
  const Segmenter = (
    Intl as typeof Intl & {
      Segmenter?: new (
        locale?: string,
        options?: { granularity: 'word' },
      ) => { segment: (value: string) => Iterable<{ segment: string }> };
    }
  ).Segmenter;

  if (!Segmenter) return fallbackTokenize(normalized);

  try {
    const segmenter = new Segmenter(resolveSegmenterLocale(lang), {
      granularity: 'word',
    });
    return Array.from(segmenter.segment(normalized), (item) => item.segment);
  } catch {
    return fallbackTokenize(normalized);
  }
}

function mergeParts(parts: TextDiffPart[]) {
  return parts.reduce<TextDiffPart[]>((result, part) => {
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

  const reversed: TextDiffPart[] = [];
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

export function diffText(
  beforeText: string,
  afterText: string,
  lang = 'en',
) {
  try {
    const before = tokenizeText(beforeText, lang);
    const after = tokenizeText(afterText, lang);
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
    const middleParts: TextDiffPart[] =
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
