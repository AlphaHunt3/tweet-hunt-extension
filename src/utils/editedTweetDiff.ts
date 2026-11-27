import type { EditedTweetChain, EditedTweetVersion } from '~types';
import {
  diffText,
  tokenizeText,
  type TextDiffKind,
  type TextDiffPart,
} from '~utils/textDiff';

export type EditedTweetDiffKind = TextDiffKind;
export type EditedTweetDiffPart = TextDiffPart;

export interface EditedTweetTransition {
  key: string;
  beforeId: string;
  afterId: string;
  before?: EditedTweetVersion;
  after?: EditedTweetVersion;
  status: 'available' | 'pending';
}

const CONTEXT_TOKENS = 6;

export function tokenizeEditedTweetText(text: string, lang = 'en') {
  return tokenizeText(text, lang);
}

export function diffEditedTweetText(
  beforeText: string,
  afterText: string,
  lang = 'en',
) {
  return diffText(beforeText, afterText, lang);
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
